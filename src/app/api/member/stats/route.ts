import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const contributions = await prisma.contribution.findMany({
      where: { userId: dbUser.id },
      include: { batch: true },
    });

    const payouts = await prisma.payout.findMany({
      where: { userId: dbUser.id },
    });

    // Only count CASH contributions for totalInvested (actual new money put in)
    // REINVEST contributions are recycled money from previous batches, not new investment
    const totalInvested = contributions
      .filter((c) => c.source === "CASH")
      .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);

    // Active principal = contributions in OPEN batches
    const activePrincipal = contributions
      .filter((c) => c.batch.status === "OPEN")
      .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);

    const totalProfit = payouts.reduce(
      (sum, p) => sum + parseFloat(p.profit.toString()),
      0
    );

    const totalCashout = payouts.reduce(
      (sum, p) => sum + parseFloat(p.cashout.toString()),
      0
    );

    // Total reinvested from closed batches
    const totalReinvested = payouts.reduce(
      (sum, p) => sum + parseFloat(p.reinvested.toString()),
      0
    );

    const activeInvestments = contributions.filter(
      (c) => c.batch.status === "OPEN"
    ).length;

    return NextResponse.json({
      stats: {
        totalInvested,
        activePrincipal,
        totalProfit,
        totalCashout,
        totalReinvested,
        activeInvestments,
        totalBatches: new Set(contributions.map((c) => c.batchId)).size,
      },
      user: {
        role: dbUser.role,
        name: dbUser.name,
        email: dbUser.email,
      },
    });
  } catch (error) {
    console.error("Error fetching member stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
