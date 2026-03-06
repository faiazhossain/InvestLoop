import { prisma } from "./prisma";
import Decimal from "decimal.js";

// Default share price - can be overridden by SystemConfig
export const DEFAULT_SHARE_PRICE = 2000;

// Get share price from config or use default
export async function getSharePrice(): Promise<Decimal> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: "SHARE_PRICE" },
  });
  return new Decimal(config?.value || DEFAULT_SHARE_PRICE);
}

// Calculate shares from amount
export function calculateShares(amount: Decimal, sharePrice: Decimal): Decimal {
  return amount.dividedBy(sharePrice).toDecimalPlaces(4);
}

// Calculate amount from shares
export function calculateAmount(shares: Decimal, sharePrice: Decimal): Decimal {
  return shares.times(sharePrice).toDecimalPlaces(2);
}

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

  const sharePrice = await getSharePrice();
  const batchPrincipal = new Decimal(batch.principal.toString());
  const batchProfit = new Decimal(batch.profit.toString());
  const batchTotalShares = new Decimal(batch.totalShares.toString());
  
  // Calculate profit per share for this batch
  const profitPerShare = batchTotalShares.isZero() 
    ? new Decimal(0) 
    : batchProfit.dividedBy(batchTotalShares).toDecimalPlaces(4);

  // Update batch with profitPerShare
  await prisma.batch.update({
    where: { id: batchId },
    data: { profitPerShare },
  });

  // Get all reinvestments coming FROM this batch
  const reinvestments = await prisma.reinvestment.findMany({
    where: {
      sourceBatchId: batchId,
    },
  });

  // Group reinvestments by user
  const reinvestmentsByUser = new Map<string, Decimal>();
  for (const r of reinvestments) {
    const current = reinvestmentsByUser.get(r.userId) || new Decimal(0);
    reinvestmentsByUser.set(r.userId, current.plus(r.amount.toString()));
  }

  // Group contributions by user (both amount and shares)
  const contributionsByUser = new Map<string, { amount: Decimal; shares: Decimal }>();
  for (const c of batch.contributions) {
    const current = contributionsByUser.get(c.userId) || { amount: new Decimal(0), shares: new Decimal(0) };
    contributionsByUser.set(c.userId, {
      amount: current.amount.plus(c.amount.toString()),
      shares: current.shares.plus(c.shares.toString()),
    });
  }

  // Calculate payouts for each user
  const payouts = [];
  for (const [userId, { amount: memberPrincipal, shares: memberShares }] of contributionsByUser) {
    if (memberPrincipal.isZero()) continue;

    // Calculate member's profit based on shares
    const memberProfit = memberShares.times(profitPerShare);

    // Gross payout = principal + profit
    const grossPayout = memberPrincipal.plus(memberProfit);

    // Reinvested amount from this batch
    const reinvested = reinvestmentsByUser.get(userId) || new Decimal(0);

    // Cashout = gross payout - reinvested
    const cashout = grossPayout.minus(reinvested);

    payouts.push({
      userId,
      batchId,
      shares: memberShares.toDecimalPlaces(4),
      principal: memberPrincipal.toDecimalPlaces(2),
      profit: memberProfit.toDecimalPlaces(2),
      profitPerShare: profitPerShare.toDecimalPlaces(4),
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

  const totalShares = batch.contributions.reduce(
    (sum, c) => sum + parseFloat(c.shares.toString()),
    0
  );

  const uniqueContributors = new Set(batch.contributions.map((c) => c.userId))
    .size;

  return {
    totalContributions,
    totalShares,
    uniqueContributors,
    hasReturn: !!batch.return,
    totalPayouts: batch.payouts.length,
    profitPerShare: batch.profitPerShare ? parseFloat(batch.profitPerShare.toString()) : 0,
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

  // Only count CASH contributions for totalInvested (actual new money put in)
  // REINVEST contributions are recycled money, not new investment
  const totalInvested = contributions
    .filter((c) => c.source === "CASH")
    .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);

  // Total shares from CASH contributions
  const totalSharesFromCash = contributions
    .filter((c) => c.source === "CASH")
    .reduce((sum, c) => sum + parseFloat(c.shares.toString()), 0);

  // Active principal = contributions in OPEN batches
  const activePrincipal = contributions
    .filter((c) => c.batch.status === "OPEN")
    .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);

  // Active shares = shares in OPEN batches
  const activeShares = contributions
    .filter((c) => c.batch.status === "OPEN")
    .reduce((sum, c) => sum + parseFloat(c.shares.toString()), 0);

  const totalProfit = payouts.reduce(
    (sum, p) => sum + parseFloat(p.profit.toString()),
    0
  );

  const totalCashout = payouts.reduce(
    (sum, p) => sum + parseFloat(p.cashout.toString()),
    0
  );

  const totalReinvested = payouts.reduce(
    (sum, p) => sum + parseFloat(p.reinvested.toString()),
    0
  );

  const activeInvestments = contributions.filter(
    (c) => c.batch.status === "OPEN"
  ).length;

  return {
    totalInvested,
    totalSharesFromCash,
    activePrincipal,
    activeShares,
    totalProfit,
    totalCashout,
    totalReinvested,
    activeInvestments,
    totalBatches: new Set(contributions.map((c) => c.batchId)).size,
  };
}
