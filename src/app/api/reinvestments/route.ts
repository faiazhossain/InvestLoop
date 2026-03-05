import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import { calculatePayouts } from "@/lib/calculations";

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
    const { sourceBatchId, targetBatchId, newBatchName, newBatchDescription, decisions } = body;

    // Validate source batch
    const sourceBatch = await prisma.batch.findUnique({
      where: { id: sourceBatchId },
      include: { return: true },
    });

    if (!sourceBatch) {
      return NextResponse.json({ error: "Source batch not found" }, { status: 404 });
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
    const reinvestDecisions = decisions.filter(d => d.decision === "REINVEST" && parseFloat(d.amount) > 0);

    if (reinvestDecisions.length === 0) {
      return NextResponse.json(
        { error: "No reinvestment decisions to process" },
        { status: 400 }
      );
    }

    let finalTargetBatchId = targetBatchId;

    // Create new batch if needed
    if (!targetBatchId && newBatchName) {
      const newBatch = await prisma.batch.create({
        data: {
          name: newBatchName,
          description: newBatchDescription || `Reinvestment from ${sourceBatch.name}`,
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
      return NextResponse.json({ error: "Target batch not found" }, { status: 404 });
    }

    if (targetBatch.status !== "OPEN") {
      return NextResponse.json(
        { error: "Target batch must be open" },
        { status: 400 }
      );
    }

    // Create contributions for each reinvestment decision
    const createdContributions = [];
    let totalReinvested = new Decimal(0);

    for (const decision of reinvestDecisions) {
      const amount = new Decimal(decision.amount);

      if (amount.isZero() || amount.isNegative()) continue;

      // Validate user exists and is active
      const member = await prisma.user.findUnique({
        where: { id: decision.userId },
      });

      if (!member || !member.isActive) {
        continue; // Skip inactive members
      }

      const contribution = await prisma.contribution.create({
        data: {
          userId: decision.userId,
          batchId: finalTargetBatchId,
          amount: amount,
          source: "REINVEST",
          sourceBatchId: sourceBatchId,
          date: new Date(),
          notes: `Reinvestment from ${sourceBatch.name}`,
        },
        include: {
          user: true,
          batch: true,
        },
      });

      createdContributions.push(contribution);
      totalReinvested = totalReinvested.plus(amount);
    }

    // Update target batch principal
    await prisma.batch.update({
      where: { id: finalTargetBatchId },
      data: {
        principal: targetBatch.principal.plus(totalReinvested),
      },
    });

    // Recalculate payouts for source batch to update reinvested/cashout amounts
    await calculatePayouts(sourceBatchId);

    return NextResponse.json({
      success: true,
      contributions: createdContributions,
      totalReinvested: totalReinvested.toString(),
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
