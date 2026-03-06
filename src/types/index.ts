import { z } from "zod";

// Enums
export type UserRole = "ADMIN" | "MEMBER";
export type BatchStatus = "OPEN" | "CLOSED";
export type ContributionSource = "CASH" | "REINVEST";

// User
export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const userFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["ADMIN", "MEMBER"]),
  isActive: z.boolean(),
});

export type UserFormData = z.infer<typeof userFormSchema>;

// Batch
export interface Batch {
  id: string;
  name: string;
  description: string | null;
  principal: string;
  totalShares: string;
  profit: string;
  profitPerShare: string;
  status: BatchStatus;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const batchFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
});

export type BatchFormData = z.infer<typeof batchFormSchema>;

// Contribution
export interface Contribution {
  id: string;
  userId: string;
  batchId: string;
  amount: string;
  shares: string;
  source: ContributionSource;
  date: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  batch?: Batch;
  reinvestment?: Reinvestment;
}

export const contributionFormSchema = z.object({
  userId: z.string().min(1, "Member is required"),
  batchId: z.string().min(1, "Batch is required"),
  amount: z.string().min(1, "Amount is required"),
  source: z.enum(["CASH", "REINVEST"]),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export type ContributionFormData = z.infer<typeof contributionFormSchema>;

// Return
export interface Return {
  id: string;
  batchId: string;
  totalReturn: string;
  profit: string;
  date: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  batch?: Batch;
}

export const returnFormSchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  totalReturn: z.string().min(1, "Total return is required"),
  profit: z.string().min(1, "Profit is required"),
  notes: z.string().optional(),
});

export type ReturnFormData = z.infer<typeof returnFormSchema>;

// Payout
export interface Payout {
  id: string;
  userId: string;
  batchId: string;
  shares: string;
  principal: string;
  profit: string;
  profitPerShare: string;
  grossPayout: string;
  reinvested: string;
  cashout: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  batch?: Batch;
  reinvestments?: Reinvestment[];
}

// Reinvestment
export interface Reinvestment {
  id: string;
  userId: string;
  sourceBatchId: string;
  targetBatchId: string;
  sourcePayoutId: string;
  targetContributionId: string | null;
  amount: string;
  date: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  sourceBatch?: Batch;
  targetBatch?: Batch;
  sourcePayout?: Payout;
  targetContribution?: Contribution;
}

export const reinvestmentFormSchema = z.object({
  userId: z.string().min(1, "Member is required"),
  sourceBatchId: z.string().min(1, "Source batch is required"),
  targetBatchId: z.string().min(1, "Target batch is required"),
  sourcePayoutId: z.string().min(1, "Source payout is required"),
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export type ReinvestmentFormData = z.infer<typeof reinvestmentFormSchema>;

// System Config
export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Default share price constant
export const DEFAULT_SHARE_PRICE = 2000;

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Dashboard stats
export interface MemberStats {
  totalInvested: number;
  activePrincipal: number;
  totalProfit: number;
  totalCashout: number;
  totalReinvested: number;
  activeInvestments: number;
  totalBatches: number;
}

export interface AdminStats {
  totalMembers: number;
  activeMembers: number;
  totalBatches: number;
  openBatches: number;
  totalInvested: number;
  activePrincipal: number;
  totalProfit: number;
}

// Batch with reinvestment data
export interface BatchWithReinvestment extends Batch {
  _count?: {
    contributions: number;
    payouts: number;
  };
  sourceReinvestments?: Reinvestment[];
  payouts?: Payout[];
  // Calculated fields
  totalReinvested?: number;
  totalCashout?: number;
  reinvestmentTargets?: string[];
}
