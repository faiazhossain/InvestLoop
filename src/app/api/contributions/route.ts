import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import { getSharePrice, calculateShares } from "@/lib/calculations";

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
    const userId = searchParams.get("userId");

    const where: Record<string, unknown> = {};

    if (dbUser.role !== "ADMIN") {
      where.userId = dbUser.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (batchId) {
      where.batchId = batchId;
    }

    const contributions = await prisma.contribution.findMany({
      where,
      include: {
        user: true,
        batch: true,
        reinvestment: {
          include: {
            sourceBatch: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ contributions });
  } catch (error) {
    console.error("Error fetching contributions:", error);
    return NextResponse.json(
      { error: "Failed to fetch contributions" },
      { status: 500 }
    );
  }
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

    const body = await request.json();

    // Check if this is a bulk create request
    if (body.contributions && Array.isArray(body.contributions)) {
      return handleBulkCreate(body, dbUser);
    }

    // Single contribution creation
    const { userId, batchId, amount, source, date, notes } = body;

    // Validate batch is open
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (batch.status !== "OPEN") {
      return NextResponse.json(
        { error: "Cannot add contributions to a closed batch" },
        { status: 400 }
      );
    }

    // Validate user is active
    const member = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!member || !member.isActive) {
      return NextResponse.json(
        { error: "Member not found or inactive" },
        { status: 400 }
      );
    }

    // Calculate shares based on amount
    const sharePrice = await getSharePrice();
    const amountDecimal = new Decimal(amount);
    const shares = calculateShares(amountDecimal, sharePrice);

    const contribution = await prisma.contribution.create({
      data: {
        userId,
        batchId,
        amount: amountDecimal,
        shares,
        source: source || "CASH",
        date: new Date(date),
        notes,
      },
      include: {
        user: true,
        batch: true,
      },
    });

    // Update batch principal and totalShares
    await prisma.batch.update({
      where: { id: batchId },
      data: {
        principal: batch.principal.plus(amount),
        totalShares: batch.totalShares.plus(shares),
      },
    });

    return NextResponse.json({ contribution });
  } catch (error) {
    console.error("Error creating contribution:", error);
    return NextResponse.json(
      { error: "Failed to create contribution" },
      { status: 500 }
    );
  }
}

async function handleBulkCreate(
  body: {
    contributions: Array<{
      userId: string;
      batchId: string;
      amount: string | number;
      source?: string;
      date: string;
      notes?: string;
    }>;
  },
  _dbUser: { id: string; role: string }
) {
  const { contributions } = body;

  if (contributions.length === 0) {
    return NextResponse.json(
      { error: "No contributions provided" },
      { status: 400 }
    );
  }

  // All contributions should be for the same batch
  const batchId = contributions[0].batchId;
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  if (batch.status !== "OPEN") {
    return NextResponse.json(
      { error: "Cannot add contributions to a closed batch" },
      { status: 400 }
    );
  }

  // Validate all users exist and are active
  const userIds = [...new Set(contributions.map((c) => c.userId))];
  const members = await prisma.user.findMany({
    where: { id: { in: userIds } },
  });

  const inactiveMembers = members.filter((m) => !m.isActive);
  if (inactiveMembers.length > 0) {
    return NextResponse.json(
      { error: "Some members are inactive" },
      { status: 400 }
    );
  }

  const missingUserIds = userIds.filter(
    (id) => !members.find((m) => m.id === id)
  );
  if (missingUserIds.length > 0) {
    return NextResponse.json(
      { error: "Some members not found" },
      { status: 400 }
    );
  }

  // Get share price for calculations
  const sharePrice = await getSharePrice();

  // Calculate total amount and shares
  let totalAmount = new Decimal(0);
  let totalShares = new Decimal(0);

  const contributionsWithShares = contributions.map((c) => {
    const amount = new Decimal(c.amount);
    const shares = calculateShares(amount, sharePrice);
    totalAmount = totalAmount.plus(amount);
    totalShares = totalShares.plus(shares);
    return {
      ...c,
      amount,
      shares,
    };
  });

  // Use transaction to create all contributions and update batch principal atomically
  const result = await prisma.$transaction(async (tx) => {
    const createdContributions = await tx.contribution.createMany({
      data: contributionsWithShares.map((c) => ({
        userId: c.userId,
        batchId: c.batchId,
        amount: c.amount,
        shares: c.shares,
        source: (c.source as "CASH" | "REINVEST") || "CASH",
        date: new Date(c.date),
        notes: c.notes,
      })),
    });

    // Update batch principal and totalShares
    await tx.batch.update({
      where: { id: batchId },
      data: {
        principal: batch.principal.plus(totalAmount),
        totalShares: batch.totalShares.plus(totalShares),
      },
    });

    return createdContributions;
  });

  return NextResponse.json({
    success: true,
    count: result.count,
    totalAmount: totalAmount.toString(),
    totalShares: totalShares.toString(),
  });
}
