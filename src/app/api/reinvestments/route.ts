import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import {
  calculatePayouts,
  getSharePrice,
  calculateShares,
} from "@/lib/calculations";

interface ReinvestmentDecision {
  userId: string;
  amount: string;
  decision: "REINVEST" | "WITHDRAW";
}

interface ReinvestmentRequest {
  sourceBatchId: string;
  targetBatchId?: string;
  newBatchName?: string;
  newBatchDescription?: string;
  decisions: ReinvestmentDecision[];
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: ReinvestmentRequest = await request.json();
    const {
      sourceBatchId,
      targetBatchId,
      newBatchName,
      newBatchDescription,
      decisions,
    } = body;

    // Validate source batch
    const sourceBatch = await prisma.batch.findUnique({
      where: { id: sourceBatchId },
      include: { return: true, payouts: true },
    });

    if (!sourceBatch) {
      return NextResponse.json(
        { error: "Source batch not found" },
        { status: 404 }
      );
    }

    if (sourceBatch.status !== "CLOSED") {
      return NextResponse.json(
        { error: "Source batch must be closed" },
        { status: 400 }
      );
    }

    if (!sourceBatch.return) {
      return NextResponse.json(
        { error: "Source batch has no return recorded" },
        { status: 400 }
      );
    }

    // Filter only reinvest decisions
    const reinvestDecisions = decisions.filter(
      (d) => d.decision === "REINVEST" && parseFloat(d.amount) > 0
    );

    if (reinvestDecisions.length === 0) {
      return NextResponse.json(
        { error: "No reinvestment decisions to process" },
        { status: 400 }
      );
    }

    // Validate all users upfront to avoid queries inside transaction loop
    const userIds = reinvestDecisions.map((d) => d.userId);
    const members = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        isActive: true,
      },
    });
    const activeUserIds = new Set(members.map((m) => m.id));

    let finalTargetBatchId = targetBatchId;

    // Create new batch if needed
    if (!targetBatchId && newBatchName) {
      const newBatch = await prisma.batch.create({
        data: {
          name: newBatchName,
          description:
            newBatchDescription || `Reinvestment from ${sourceBatch.name}`,
          principal: 0,
          profit: 0,
          status: "OPEN",
          startDate: new Date(),
        },
      });
      finalTargetBatchId = newBatch.id;
    }

    if (!finalTargetBatchId) {
      return NextResponse.json(
        { error: "Target batch ID or new batch name is required" },
        { status: 400 }
      );
    }

    // Validate target batch
    const targetBatch = await prisma.batch.findUnique({
      where: { id: finalTargetBatchId },
    });

    if (!targetBatch) {
      return NextResponse.json(
        { error: "Target batch not found" },
        { status: 404 }
      );
    }

    if (targetBatch.status !== "OPEN") {
      return NextResponse.json(
        { error: "Target batch must be open" },
        { status: 400 }
      );
    }

    // Prepare valid reinvestment data upfront
    const validReinvestments: Array<{
      userId: string;
      amount: Decimal;
      shares: Decimal;
      payoutId: string;
    }> = [];

    // Get share price for calculations
    const sharePrice = await getSharePrice();

    let totalReinvested = new Decimal(0);
    let totalReinvestedShares = new Decimal(0);

    for (const decision of reinvestDecisions) {
      const amount = new Decimal(decision.amount);

      if (amount.isZero() || amount.isNegative()) continue;

      // Skip if user is not active (pre-validated)
      if (!activeUserIds.has(decision.userId)) {
        continue;
      }

      // Find the payout for this user in the source batch
      const payout = sourceBatch.payouts.find(
        (p) => p.userId === decision.userId
      );

      if (!payout) {
        continue;
      }

      // VALIDATION: Check if reinvestment amount exceeds gross payout
      const grossPayout = new Decimal(payout.grossPayout.toString());
      const alreadyReinvested = new Decimal(payout.reinvested.toString());
      const availableToReinvest = grossPayout.minus(alreadyReinvested);

      if (amount.greaterThan(availableToReinvest)) {
        return NextResponse.json(
          {
            error: `Member ${decision.userId} cannot reinvest ${amount.toString()}. Available: ${availableToReinvest.toString()}`,
          },
          { status: 400 }
        );
      }

      const shares = calculateShares(amount, sharePrice);

      validReinvestments.push({
        userId: decision.userId,
        amount,
        shares,
        payoutId: payout.id,
      });

      totalReinvested = totalReinvested.plus(amount);
      totalReinvestedShares = totalReinvestedShares.plus(shares);
    }

    if (validReinvestments.length === 0) {
      return NextResponse.json(
        { error: "No valid reinvestments to process" },
        { status: 400 }
      );
    }

    // Store created IDs for response
    const contributionIds: string[] = [];
    const reinvestmentIds: string[] = [];

    await prisma.$transaction(
      async (tx) => {
        // Create all contributions with shares
        for (const reinvest of validReinvestments) {
          const contribution = await tx.contribution.create({
            data: {
              userId: reinvest.userId,
              batchId: finalTargetBatchId!,
              amount: reinvest.amount,
              shares: reinvest.shares,
              source: "REINVEST",
              date: new Date(),
              notes: `Reinvestment from ${sourceBatch.name}`,
            },
            select: { id: true },
          });
          contributionIds.push(contribution.id);
        }

        // Create all reinvestments
        for (let i = 0; i < validReinvestments.length; i++) {
          const reinvest = validReinvestments[i];
          const contributionId = contributionIds[i];

          const reinvestment = await tx.reinvestment.create({
            data: {
              userId: reinvest.userId,
              sourceBatchId: sourceBatchId,
              targetBatchId: finalTargetBatchId!,
              sourcePayoutId: reinvest.payoutId,
              targetContributionId: contributionId,
              amount: reinvest.amount,
              date: new Date(),
              notes: `Reinvestment from ${sourceBatch.name} to ${targetBatch.name}`,
            },
            select: { id: true },
          });
          reinvestmentIds.push(reinvestment.id);
        }

        // Update target batch principal and totalShares
        await tx.batch.update({
          where: { id: finalTargetBatchId },
          data: {
            principal: {
              increment: totalReinvested.toNumber(),
            },
            totalShares: {
              increment: totalReinvestedShares.toNumber(),
            },
          },
        });
      },
      { timeout: 30000 }
    );

    // Fetch created records for response (outside transaction)
    const contributions = await prisma.contribution.findMany({
      where: { id: { in: contributionIds } },
      include: { user: true, batch: true },
    });

    const reinvestments = await prisma.reinvestment.findMany({
      where: { id: { in: reinvestmentIds } },
      include: { user: true, sourceBatch: true, targetBatch: true },
    });

    // Recalculate payouts for source batch to update reinvested/cashout amounts
    await calculatePayouts(sourceBatchId);

    return NextResponse.json({
      success: true,
      reinvestments,
      contributions,
      totalReinvested: totalReinvested.toString(),
      totalReinvestedShares: totalReinvestedShares.toString(),
      targetBatchId: finalTargetBatchId,
    });
  } catch (error) {
    console.error("Error processing reinvestments:", error);
    return NextResponse.json(
      { error: "Failed to process reinvestments" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch batches eligible for reinvestment
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");

    if (batchId) {
      // Get specific batch with payouts for reinvestment
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          return: true,
          payouts: {
            include: { user: true },
          },
        },
      });

      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }

      return NextResponse.json({ batch });
    }

    // Get all closed batches with returns
    const batches = await prisma.batch.findMany({
      where: {
        status: "CLOSED",
        return: { isNot: null },
      },
      include: {
        return: true,
        payouts: {
          include: { user: true },
        },
      },
      orderBy: { endDate: "desc" },
    });

    return NextResponse.json({ batches });
  } catch (error) {
    console.error("Error fetching reinvestment data:", error);
    return NextResponse.json(
      { error: "Failed to fetch reinvestment data" },
      { status: 500 }
    );
  }
}
