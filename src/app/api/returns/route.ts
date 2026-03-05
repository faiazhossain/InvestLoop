import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import { calculatePayouts } from "@/lib/calculations";

export async function GET() {
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

    if (dbUser.role === "ADMIN") {
      const returns = await prisma.return.findMany({
        include: {
          batch: true,
        },
        orderBy: { date: "desc" },
      });
      return NextResponse.json({ returns });
    } else {
      const memberReturns = await prisma.return.findMany({
        include: {
          batch: {
            include: {
              contributions: {
                where: { userId: dbUser.id },
              },
            },
          },
        },
        orderBy: { date: "desc" },
      });

      const returnsWithMemberData = memberReturns
        .filter((ret) => ret.batch.contributions.length > 0)
        .map((ret) => ({
          ...ret,
          memberPrincipal: ret.batch.contributions.reduce(
            (sum, c) => sum + parseFloat(c.amount.toString()),
            0
          ),
        }));

      return NextResponse.json({ returns: returnsWithMemberData });
    }
  } catch (error) {
    console.error("Error fetching returns:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns" },
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
    const { batchId, totalReturn, profit, notes } = body;

    // Check if return already exists for this batch
    const existingReturn = await prisma.return.findUnique({
      where: { batchId },
    });

    if (existingReturn) {
      return NextResponse.json(
        { error: "Return already recorded for this batch" },
        { status: 400 }
      );
    }

    // Get batch and update
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Create return and update batch
    const newReturn = await prisma.return.create({
      data: {
        batchId,
        totalReturn: new Decimal(totalReturn),
        profit: new Decimal(profit),
        notes,
      },
      include: {
        batch: true,
      },
    });

    // Update batch with profit and close it
    await prisma.batch.update({
      where: { id: batchId },
      data: {
        profit: new Decimal(profit),
        status: "CLOSED",
        endDate: new Date(),
      },
    });

    // Calculate and create payouts
    await calculatePayouts(batchId);

    return NextResponse.json({ return: newReturn });
  } catch (error) {
    console.error("Error creating return:", error);
    return NextResponse.json(
      { error: "Failed to create return" },
      { status: 500 }
    );
  }
}
