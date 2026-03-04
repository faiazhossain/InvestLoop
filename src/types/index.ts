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
  profit: string;
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
  source: ContributionSource;
  sourceBatchId: string | null;
  date: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  batch?: Batch;
}

export const contributionFormSchema = z.object({
  userId: z.string().min(1, "Member is required"),
  batchId: z.string().min(1, "Batch is required"),
  amount: z.string().min(1, "Amount is required"),
  source: z.enum(["CASH", "REINVEST"]),
  sourceBatchId: z.string().optional(),
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
  principal: string;
  profit: string;
  grossPayout: string;
  reinvested: string;
  cashout: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  batch?: Batch;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Dashboard stats
export interface MemberStats {
  totalInvested: number;
  totalProfit: number;
  totalCashout: number;
  activeInvestments: number;
  totalBatches: number;
}

export interface AdminStats {
  totalMembers: number;
  activeMembers: number;
  totalBatches: number;
  openBatches: number;
  totalPrincipal: number;
  totalProfit: number;
}
