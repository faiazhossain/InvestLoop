"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  CircleDollarSign,
  BarChart3,
  Activity,
  RefreshCw,
  Banknote,
  Percent,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Pie chart colors
const COLORS = ["#22c55e", "#a855f7"];

interface MemberPayout {
  id: string;
  principal: string;
  profit: string;
  grossPayout: string;
  reinvested: string;
  cashout: string;
  shares: string;
  date: Date;
  reinvestments: Array<{
    id: string;
    amount: string;
    targetBatch: { id: string; name: string } | null;
  }>;
}

interface MemberReturn {
  id: string;
  batchId: string;
  totalReturn: string;
  profit: string;
  date: Date;
  notes: string | null;
  batch?: {
    id: string;
    name: string;
    principal: string;
    status: string;
  };
  memberPrincipal?: number; // Total in batch (cash + reinvest)
  memberCashPrincipal?: number; // Only new cash invested
  memberReinvestPrincipal?: number; // Reinvested from other batches
  memberShares?: number;
  payout?: MemberPayout | null;
}

export default function MemberReturnsPage() {
  const [returns, setReturns] = useState<MemberReturn[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReturns() {
      try {
        const res = await fetch("/api/returns");
        if (res.ok) {
          const data = await res.json();
          setReturns(data.returns);
        }
      } catch (error) {
        console.error("Error fetching returns:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReturns();
  }, []);

  // Calculate summary statistics
  const stats = useMemo(() => {
    // Use cash principal only to avoid double counting reinvested money
    const totalCashInvested = returns.reduce(
      (sum, r) => sum + (r.memberCashPrincipal || 0),
      0
    );
    // Total principal per batch (for ROI calculations within batch)
    const totalPrincipal = returns.reduce(
      (sum, r) => sum + (r.memberPrincipal || 0),
      0
    );
    // Total reinvested into these batches (from previous batches)
    const totalReinvestInto = returns.reduce(
      (sum, r) => sum + (r.memberReinvestPrincipal || 0),
      0
    );
    const totalProfit = returns.reduce((sum, r) => {
      if (r.payout) {
        return sum + parseFloat(r.payout.profit || "0");
      }
      const batchPrincipal = parseFloat(r.batch?.principal || "0");
      const memberPrincipal = r.memberPrincipal || 0;
      const batchProfit = parseFloat(r.profit || "0");
      return (
        sum +
        (batchPrincipal > 0
          ? (memberPrincipal / batchPrincipal) * batchProfit
          : 0)
      );
    }, 0);
    const totalReinvested = returns.reduce(
      (sum, r) => sum + parseFloat(r.payout?.reinvested || "0"),
      0
    );
    const totalCashout = returns.reduce(
      (sum, r) => sum + parseFloat(r.payout?.cashout || "0"),
      0
    );
    // ROI based on actual cash invested (not counting recycled money)
    const avgROI =
      totalCashInvested > 0 ? (totalProfit / totalCashInvested) * 100 : 0;

    return {
      totalCashInvested, // New money actually put in
      totalPrincipal, // Total active in batches (includes reinvested)
      totalReinvestInto, // How much came from previous batches
      totalProfit,
      totalReinvested, // How much went out to next batches
      totalCashout,
      avgROI,
      totalBatches: returns.length,
    };
  }, [returns]);

  // Profit trend over time
  const profitTrendData = useMemo(() => {
    if (returns.length === 0) return [];

    const sorted = [...returns].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let cumulative = 0;
    return sorted.map((r) => {
      const profit = r.payout
        ? parseFloat(r.payout.profit || "0")
        : parseFloat(r.profit || "0") *
          ((r.memberPrincipal || 0) / parseFloat(r.batch?.principal || "1"));
      cumulative += profit;
      return {
        date: formatDate(r.date),
        profit,
        cumulative,
        batch: r.batch?.name || "Unknown",
      };
    });
  }, [returns]);

  // Money distribution breakdown
  const moneyDistribution = useMemo(() => {
    return [
      { name: "Cashed Out", value: stats.totalCashout },
      { name: "Reinvested", value: stats.totalReinvested },
    ].filter((item) => item.value > 0);
  }, [stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary"></div>
            <CircleDollarSign className="absolute inset-0 m-auto h-5 w-5 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading your returns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
          Investment Returns
        </h1>
        <p className="text-muted-foreground">
          Track your profits and see how your money moved across batches
        </p>
      </motion.div>

      {/* Summary Hero Card */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-background border-green-500/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Cash Invested
                </p>
                <p className="text-3xl font-bold">
                  {formatCurrency(stats.totalCashInvested)}
                </p>
                <p className="text-xs text-muted-foreground">
                  New money in {stats.totalBatches} batches
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Profit
                </p>
                <p className="text-3xl font-bold text-green-600">
                  +{formatCurrency(stats.totalProfit)}
                </p>
                <Badge
                  variant="secondary"
                  className="bg-green-500/10 text-green-600 hover:bg-green-500/20"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stats.avgROI.toFixed(1)}% avg ROI
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Cashed Out
                </p>
                <p className="text-3xl font-semibold text-emerald-600">
                  {formatCurrency(stats.totalCashout)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Money in your pocket
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Reinvested
                </p>
                <p className="text-3xl font-semibold text-purple-600">
                  {formatCurrency(stats.totalReinvested)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Compounding growth
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Batches
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBatches}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Successfully completed
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Percent className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.avgROI.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Per batch return
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.25 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Value
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalCashInvested + stats.totalProfit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cash + Profit earned
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Reinvest Rate
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {(
                  (stats.totalReinvested /
                    (stats.totalReinvested + stats.totalCashout || 1)) *
                  100
                ).toFixed(0)}
                %
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Of total payouts
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profit Trend Chart */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.35 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                Cumulative Profit
              </CardTitle>
              <CardDescription>Your earnings growth over time</CardDescription>
            </CardHeader>
            <CardContent>
              {profitTrendData.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={profitTrendData}>
                      <defs>
                        <linearGradient
                          id="profitGradientReturns"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#22c55e"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#22c55e"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) =>
                          `৳${(value / 1000).toFixed(0)}k`
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          name === "cumulative"
                            ? "Total Profit"
                            : "Batch Profit",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#profitGradientReturns)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No return data yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Money Distribution Pie Chart */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Money Distribution
              </CardTitle>
              <CardDescription>Where your returns went</CardDescription>
            </CardHeader>
            <CardContent>
              {moneyDistribution.length > 0 ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={moneyDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {moneyDistribution.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col justify-center gap-4">
                      {moneyDistribution.map((item, index) => (
                        <div
                          key={item.name}
                          className="flex items-center gap-3"
                        >
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.value)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No distribution data yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Batch Returns Detail */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.45 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Completed Batch Returns
              </CardTitle>
              <CardDescription>
                Detailed breakdown of each batch with money flow visualization
              </CardDescription>
            </div>
            {returns.length > 0 && (
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-600"
              >
                +{formatCurrency(stats.totalProfit)} total profit
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {returns.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">
                  No returns recorded yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Returns appear when batches complete
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {returns.map((ret) => {
                  const batchPrincipal = parseFloat(
                    ret.batch?.principal || "0"
                  );
                  const memberPrincipal = ret.memberPrincipal || 0;
                  const batchProfit = parseFloat(ret.profit || "0");

                  // Use payout data if available, otherwise calculate
                  const memberProfit = ret.payout
                    ? parseFloat(ret.payout.profit || "0")
                    : batchPrincipal > 0
                      ? (memberPrincipal / batchPrincipal) * batchProfit
                      : 0;
                  const grossPayout = ret.payout
                    ? parseFloat(ret.payout.grossPayout || "0")
                    : memberPrincipal + memberProfit;
                  const reinvestedAmount = ret.payout
                    ? parseFloat(ret.payout.reinvested || "0")
                    : 0;
                  const cashoutAmount = ret.payout
                    ? parseFloat(ret.payout.cashout || "0")
                    : grossPayout;

                  const reinvestPercent =
                    grossPayout > 0
                      ? (reinvestedAmount / grossPayout) * 100
                      : 0;
                  const cashoutPercent =
                    grossPayout > 0 ? (cashoutAmount / grossPayout) * 100 : 0;
                  const roi =
                    memberPrincipal > 0
                      ? (memberProfit / memberPrincipal) * 100
                      : 0;

                  const isFullyReinvested = reinvestPercent >= 99.9;
                  const isFullyCashedOut = cashoutPercent >= 99.9;
                  const isSplit =
                    !isFullyReinvested &&
                    !isFullyCashedOut &&
                    reinvestedAmount > 0 &&
                    cashoutAmount > 0;

                  return (
                    <div
                      key={ret.id}
                      className={`rounded-lg border p-4 transition-all hover:shadow-md ${
                        isFullyReinvested
                          ? "border-purple-500/30 bg-purple-500/5"
                          : isFullyCashedOut
                            ? "border-green-500/30 bg-green-500/5"
                            : "border-border"
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              isFullyReinvested
                                ? "bg-purple-500/20 text-purple-600"
                                : isFullyCashedOut
                                  ? "bg-green-500/20 text-green-600"
                                  : "bg-primary/10 text-primary"
                            }`}
                          >
                            {ret.batch?.name?.slice(0, 2) || "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-lg">
                              {ret.batch?.name || "Unknown Batch"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Completed {formatDate(ret.date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className="bg-green-500/10 text-green-600 border-green-500/30"
                            variant="outline"
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {roi.toFixed(1)}% ROI
                          </Badge>
                          <Badge
                            className={`${
                              isFullyReinvested
                                ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                : isFullyCashedOut
                                  ? "bg-green-500/10 text-green-600 border-green-500/30"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            }`}
                            variant="outline"
                          >
                            {isFullyReinvested && (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1" /> Fully
                                Reinvested
                              </>
                            )}
                            {isFullyCashedOut && (
                              <>
                                <Banknote className="h-3 w-3 mr-1" /> Fully
                                Cashed Out
                              </>
                            )}
                            {isSplit && (
                              <>
                                <Activity className="h-3 w-3 mr-1" /> Split
                                Payout
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>

                      {/* Financial breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">
                            Your Principal
                          </p>
                          <p className="font-semibold">
                            {formatCurrency(memberPrincipal)}
                          </p>
                        </div>
                        <div className="bg-green-500/10 rounded-lg p-3 text-center">
                          <p className="text-xs text-green-600 mb-1 flex items-center justify-center gap-1">
                            <TrendingUp className="h-3 w-3" /> Profit
                          </p>
                          <p className="font-semibold text-green-600">
                            +{formatCurrency(memberProfit)}
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">
                            Gross Payout
                          </p>
                          <p className="font-bold">
                            {formatCurrency(grossPayout)}
                          </p>
                        </div>
                        <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                          <p className="text-xs text-blue-600 mb-1">Shares</p>
                          <p className="font-semibold text-blue-600">
                            {(ret.memberShares || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Distribution visual bar */}
                      {ret.payout && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Money Distribution
                            </span>
                            <span className="text-muted-foreground">
                              {reinvestPercent.toFixed(0)}% reinvested ·{" "}
                              {cashoutPercent.toFixed(0)}% cashed out
                            </span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                            {reinvestedAmount > 0 && (
                              <div
                                className="bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                                style={{ width: `${reinvestPercent}%` }}
                              />
                            )}
                            {cashoutAmount > 0 && (
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                                style={{ width: `${cashoutPercent}%` }}
                              />
                            )}
                          </div>

                          {/* Legend with amounts */}
                          <div className="flex items-center justify-between mt-2">
                            {reinvestedAmount > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-purple-500" />
                                <span className="text-sm">
                                  <span className="text-purple-600 font-semibold">
                                    {formatCurrency(reinvestedAmount)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {" "}
                                    reinvested
                                  </span>
                                </span>
                              </div>
                            )}
                            {cashoutAmount > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-sm">
                                  <span className="text-green-600 font-semibold">
                                    {formatCurrency(cashoutAmount)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {" "}
                                    withdrawn
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Reinvestment destination */}
                      {ret.payout?.reinvestments &&
                        ret.payout.reinvestments.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-dashed">
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <RefreshCw className="h-3 w-3" /> Money moved to:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {ret.payout.reinvestments.map((r) => (
                                <Badge
                                  key={r.id}
                                  variant="outline"
                                  className="bg-purple-500/10 text-purple-600 border-purple-500/30 py-1.5"
                                >
                                  <ArrowUpRight className="h-3 w-3 mr-1" />
                                  {r.targetBatch?.name || "New Batch"}
                                  <span className="ml-1 text-purple-400">
                                    (
                                    {formatCurrency(
                                      r.amount || reinvestedAmount
                                    )}
                                    )
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Summary Footer */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.5 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <PiggyBank className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash Invested</p>
                <p className="text-xl font-bold">
                  {formatCurrency(stats.totalCashInvested)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className="text-xl font-bold text-green-600">
                  +{formatCurrency(stats.totalProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Percent className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average ROI</p>
                <p className="text-xl font-bold text-purple-600">
                  +{stats.avgROI.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
