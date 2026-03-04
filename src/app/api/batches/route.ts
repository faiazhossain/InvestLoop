import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

    let batches;

    if (dbUser.role === "ADMIN") {
      batches = await prisma.batch.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { contributions: true, payouts: true },
          },
        },
      });
    } else {
      // Members see batches they've contributed to
      batches = await prisma.batch.findMany({
        where: {
          contributions: {
            some: {
              userId: dbUser.id,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ batches });
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json(
      { error: "Failed to fetch batches" },
      { status: 500 },
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
    const { name, description, startDate, endDate, status } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!startDate) {
      return NextResponse.json(
        { error: "Start date is required" },
        { status: 400 },
      );
    }

    if (endDate && startDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 },
        );
      }
    }

    const batchData: Prisma.BatchCreateInput = {
      name: name.trim(),
      startDate: new Date(startDate),
      ...(description && { description }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(status && { status }),
    };

    const batch = await prisma.batch.create({
      data: batchData,
    });

    return NextResponse.json({ batch });
  } catch (error) {
    console.error("Error creating batch:", error);
    return NextResponse.json(
      { error: "Failed to create batch" },
      { status: 500 },
    );
  }
}
