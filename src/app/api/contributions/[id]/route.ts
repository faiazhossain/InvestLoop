import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

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
    const { amount, source, sourceBatchId, date, notes } = body;

    // Get existing contribution
    const contribution = await prisma.contribution.findUnique({
      where: { id },
      include: { batch: true },
    });

    if (!contribution) {
      return NextResponse.json(
        { error: "Contribution not found" },
        { status: 404 }
      );
    }

    // Update batch principal if amount changed
    if (amount && amount !== contribution.amount.toString()) {
      const difference = new Decimal(amount).minus(contribution.amount);
      const batch = await prisma.batch.findUnique({
        where: { id: contribution.batchId },
      });

      if (batch) {
        await prisma.batch.update({
          where: { id: contribution.batchId },
          data: {
            principal: batch.principal.plus(difference),
          },
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (amount) updateData.amount = new Decimal(amount);
    if (source) updateData.source = source;
    if (sourceBatchId !== undefined) updateData.sourceBatchId = sourceBatchId;
    if (date) updateData.date = new Date(date);
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.contribution.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        batch: true,
      },
    });

    return NextResponse.json({ contribution: updated });
  } catch (error) {
    console.error("Error updating contribution:", error);
    return NextResponse.json(
      { error: "Failed to update contribution" },
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

    const contribution = await prisma.contribution.findUnique({
      where: { id },
    });

    if (!contribution) {
      return NextResponse.json(
        { error: "Contribution not found" },
        { status: 404 }
      );
    }

    // Update batch principal
    const batch = await prisma.batch.findUnique({
      where: { id: contribution.batchId },
    });

    if (batch) {
      await prisma.batch.update({
        where: { id: contribution.batchId },
        data: {
          principal: batch.principal.minus(contribution.amount),
        },
      });
    }

    await prisma.contribution.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contribution:", error);
    return NextResponse.json(
      { error: "Failed to delete contribution" },
      { status: 500 }
    );
  }
}
