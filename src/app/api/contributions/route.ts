import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

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
    const { userId, batchId, amount, source, sourceBatchId, date, notes } = body;

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

    const contribution = await prisma.contribution.create({
      data: {
        userId,
        batchId,
        amount: new Decimal(amount),
        source: source || "CASH",
        sourceBatchId: source === "REINVEST" ? sourceBatchId : null,
        date: new Date(date),
        notes,
      },
      include: {
        user: true,
        batch: true,
      },
    });

    // Update batch principal
    await prisma.batch.update({
      where: { id: batchId },
      data: {
        principal: batch.principal.plus(amount),
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
