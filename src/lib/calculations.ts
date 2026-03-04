import { prisma } from "./prisma";
import Decimal from "decimal.js";

export async function calculatePayouts(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      return: true,
      contributions: {
        include: { user: true },
      },
    },
  });

  if (!batch || !batch.return) {
    throw new Error("Batch not found or no return recorded");
  }

  const batchPrincipal = new Decimal(batch.principal.toString());
  const batchProfit = new Decimal(batch.profit.toString());

  // Get all reinvestments coming FROM this batch
  const reinvestments = await prisma.contribution.findMany({
    where: {
      sourceBatchId: batchId,
      source: "REINVEST",
    },
  });

  // Group reinvestments by user
  const reinvestmentsByUser = new Map<string, Decimal>();
  for (const r of reinvestments) {
    const current = reinvestmentsByUser.get(r.userId) || new Decimal(0);
    reinvestmentsByUser.set(r.userId, current.plus(r.amount.toString()));
  }

  // Group contributions by user
  const contributionsByUser = new Map<string, Decimal>();
  for (const c of batch.contributions) {
    const current = contributionsByUser.get(c.userId) || new Decimal(0);
    contributionsByUser.set(c.userId, current.plus(c.amount.toString()));
  }

  // Calculate payouts for each user
  const payouts = [];
  for (const [userId, memberPrincipal] of contributionsByUser) {
    if (memberPrincipal.isZero()) continue;

    // Calculate member's share of profit
    const memberProfit = memberPrincipal
      .dividedBy(batchPrincipal)
      .times(batchProfit);

    // Gross payout = principal + profit
    const grossPayout = memberPrincipal.plus(memberProfit);

    // Reinvested amount from this batch
    const reinvested = reinvestmentsByUser.get(userId) || new Decimal(0);

    // Cashout = gross payout - reinvested
    const cashout = grossPayout.minus(reinvested);

    payouts.push({
      userId,
      batchId,
      principal: memberPrincipal.toDecimalPlaces(2),
      profit: memberProfit.toDecimalPlaces(2),
      grossPayout: grossPayout.toDecimalPlaces(2),
      reinvested: reinvested.toDecimalPlaces(2),
      cashout: cashout.toDecimalPlaces(2),
    });
  }

  // Create or update payouts
  for (const payout of payouts) {
    await prisma.payout.upsert({
      where: {
        payout_user_batch_unique: {
          userId: payout.userId,
          batchId: payout.batchId,
        },
      },
      update: payout,
      create: payout,
    });
  }

  return payouts;
}

export async function getBatchStats(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      contributions: true,
      return: true,
      payouts: true,
    },
  });

  if (!batch) return null;

  const totalContributions = batch.contributions.reduce(
    (sum, c) => sum + parseFloat(c.amount.toString()),
    0
  );

  const uniqueContributors = new Set(batch.contributions.map((c) => c.userId)).size;

  return {
    totalContributions,
    uniqueContributors,
    hasReturn: !!batch.return,
    totalPayouts: batch.payouts.length,
  };
}

export async function getUserStats(userId: string) {
  const contributions = await prisma.contribution.findMany({
    where: { userId },
    include: { batch: true },
  });

  const payouts = await prisma.payout.findMany({
    where: { userId },
  });

  const totalInvested = contributions.reduce(
    (sum, c) => sum + parseFloat(c.amount.toString()),
    0
  );

  const totalProfit = payouts.reduce(
    (sum, p) => sum + parseFloat(p.profit.toString()),
    0
  );

  const totalCashout = payouts.reduce(
    (sum, p) => sum + parseFloat(p.cashout.toString()),
    0
  );

  const activeInvestments = contributions.filter(
    (c) => c.batch.status === "OPEN"
  ).length;

  return {
    totalInvested,
    totalProfit,
    totalCashout,
    activeInvestments,
    totalBatches: new Set(contributions.map((c) => c.batchId)).size,
  };
}
