import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

    // Members can only see their own payouts
    if (dbUser.role !== "ADMIN") {
      where.userId = dbUser.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (batchId) {
      where.batchId = batchId;
    }

    const payouts = await prisma.payout.findMany({
      where,
      include: {
        user: true,
        batch: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ payouts });
  } catch (error) {
    console.error("Error fetching payouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch payouts" },
      { status: 500 }
    );
  }
}
