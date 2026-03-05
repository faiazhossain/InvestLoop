import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import { calculatePayouts } from "@/lib/calculations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: {
        batch: true,
      },
    });

    if (!returnRecord) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    return NextResponse.json({ return: returnRecord });
  } catch (error) {
    console.error("Error fetching return:", error);
    return NextResponse.json(
      { error: "Failed to fetch return" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { totalReturn, profit, notes, date } = body;

    const existingReturn = await prisma.return.findUnique({
      where: { id },
      include: { batch: true },
    });

    if (!existingReturn) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    const updateData: {
      totalReturn?: Decimal;
      profit?: Decimal;
      notes?: string | null;
      date?: Date;
    } = {};

    if (totalReturn !== undefined) {
      updateData.totalReturn = new Decimal(totalReturn);
    }
    if (profit !== undefined) {
      updateData.profit = new Decimal(profit);
    }
    if (notes !== undefined) {
      updateData.notes = notes || null;
    }
    if (date !== undefined) {
      updateData.date = new Date(date);
    }

    const updatedReturn = await prisma.return.update({
      where: { id },
      data: updateData,
      include: {
        batch: true,
      },
    });

    if (profit !== undefined) {
      await prisma.batch.update({
        where: { id: existingReturn.batchId },
        data: {
          profit: new Decimal(profit),
        },
      });

      await calculatePayouts(existingReturn.batchId);
    }

    return NextResponse.json({ return: updatedReturn });
  } catch (error) {
    console.error("Error updating return:", error);
    return NextResponse.json(
      { error: "Failed to update return" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const existingReturn = await prisma.return.findUnique({
      where: { id },
      include: { batch: true },
    });

    if (!existingReturn) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    const batchId = existingReturn.batchId;

    await prisma.payout.deleteMany({
      where: { batchId },
    });

    await prisma.return.delete({
      where: { id },
    });

    await prisma.batch.update({
      where: { id: batchId },
      data: {
        profit: new Decimal(0),
        status: "OPEN",
        endDate: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting return:", error);
    return NextResponse.json(
      { error: "Failed to delete return" },
      { status: 500 }
    );
  }
}
