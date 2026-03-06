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

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [totalMembers, activeMembers, batches, cashContributions] =
      await Promise.all([
        prisma.user.count({ where: { role: { in: ["MEMBER", "ADMIN"] } } }),
        prisma.user.count({
          where: { role: { in: ["MEMBER", "ADMIN"] }, isActive: true },
        }),
        prisma.batch.findMany({
          select: {
            principal: true,
            profit: true,
            status: true,
          },
        }),
        // Only count CASH contributions for total invested (excludes reinvestments to avoid double-counting)
        prisma.contribution.aggregate({
          where: { source: "CASH" },
          _sum: { amount: true },
        }),
      ]);

    // Active principal = sum of principals in OPEN batches only
    const activePrincipal = batches
      .filter((b) => b.status === "OPEN")
      .reduce((sum, b) => sum + parseFloat(b.principal.toString()), 0);

    // Total invested = only CASH contributions (new money injected)
    const totalInvested = parseFloat(
      cashContributions._sum.amount?.toString() || "0"
    );

    const totalProfit = batches.reduce(
      (sum, b) => sum + parseFloat(b.profit.toString()),
      0
    );

    return NextResponse.json({
      stats: {
        totalMembers,
        activeMembers,
        totalBatches: batches.length,
        openBatches: batches.filter((b) => b.status === "OPEN").length,
        totalInvested,
        activePrincipal,
        totalProfit,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
