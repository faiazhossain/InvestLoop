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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MemberStats, Contribution, Payout } from "@/types";
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
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  CircleDollarSign,
  BarChart3,
  Activity,
  Layers,
  RefreshCw,
  Banknote,
  Percent,
} from "lucide-react";
// TakaIcon is available if needed for BDT currency displays
import { motion } from "framer-motion";

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Pie chart colors
const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

export default function MemberDashboard() {
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, contributionsRes, payoutsRes] = await Promise.all([
          fetch("/api/member/stats"),
          fetch("/api/contributions"),
          fetch("/api/payouts"),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
          setUserName(data.user?.name || "");
        }

        if (contributionsRes.ok) {
          const data = await contributionsRes.json();
          setContributions(data.contributions);
        }

        if (payoutsRes.ok) {
          const data = await payoutsRes.json();
          setPayouts(data.payouts);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    if (!stats) return null;

    const totalValue = stats.totalInvested + stats.totalProfit;
    const roi =
      stats.totalInvested > 0
        ? (stats.totalProfit / stats.totalInvested) * 100
        : 0;

    // Calculate shares from contributions
    const totalShares = contributions.reduce(
      (sum, c) => sum + parseFloat(c.shares || "0"),
      0
    );

    // Cash vs Reinvest breakdown
    const cashContributions = contributions
      .filter((c) => c.source === "CASH")
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const reinvestContributions = contributions
      .filter((c) => c.source === "REINVEST")
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);

    return {
      totalValue,
      roi,
      totalShares,
      cashContributions,
      reinvestContributions,
    };
  }, [stats, contributions]);

  // Profit trend over time for area chart
  const profitChartData = useMemo(() => {
    if (payouts.length === 0) return [];

    // Sort by date and calculate cumulative profit
    const sorted = [...payouts].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let cumulative = 0;
    return sorted.map((p) => {
      cumulative += parseFloat(p.profit);
      return {
        date: formatDate(p.date),
        profit: parseFloat(p.profit),
        cumulative,
        batch: p.batch?.name || "Unknown",
      };
    });
  }, [payouts]);

  // Investment breakdown by batch - can be used for additional pie chart
  // showing distribution across different batches

  // Source breakdown (Cash vs Reinvest) for pie chart
  const sourceBreakdown = useMemo(() => {
    if (!derivedMetrics) return [];
    return [
      { name: "Cash Investment", value: derivedMetrics.cashContributions },
      { name: "Reinvested", value: derivedMetrics.reinvestContributions },
    ].filter((item) => item.value > 0);
  }, [derivedMetrics]);

  // Batch performance for bar chart - now with reinvest/cashout breakdown
  const batchPerformance = useMemo(() => {
    const byBatch: Record<
      string,
      {
        principal: number;
        profit: number;
        reinvested: number;
        cashout: number;
      }
    > = {};
    payouts.forEach((p) => {
      const batchName = p.batch?.name || "Unknown";
      if (!byBatch[batchName]) {
        byBatch[batchName] = {
          principal: 0,
          profit: 0,
          reinvested: 0,
          cashout: 0,
        };
      }
      byBatch[batchName].principal += parseFloat(p.principal);
      byBatch[batchName].profit += parseFloat(p.profit);
      byBatch[batchName].reinvested += parseFloat(p.reinvested || "0");
      byBatch[batchName].cashout += parseFloat(p.cashout || "0");
    });
    return Object.entries(byBatch).map(([name, data]) => ({
      name,
      principal: data.principal,
      profit: data.profit,
      reinvested: data.reinvested,
      cashout: data.cashout,
      roi: data.principal > 0 ? (data.profit / data.principal) * 100 : 0,
    }));
  }, [payouts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary"></div>
            <CircleDollarSign className="absolute inset-0 m-auto h-5 w-5 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading your portfolio...</p>
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
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}!
          </h1>
        </div>
        <p className="text-muted-foreground">
          Here&apos;s your personal investment portfolio overview
        </p>
      </motion.div>

      {/* Portfolio Value Hero Card */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Total Portfolio Value
                </p>
                <p className="text-4xl font-bold">
                  {formatCurrency(derivedMetrics?.totalValue || 0)}
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-green-500/10 text-green-600 hover:bg-green-500/20"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {derivedMetrics?.roi.toFixed(1)}% ROI
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Total Invested
                </p>
                <p className="text-3xl font-semibold">
                  {formatCurrency(stats?.totalInvested || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Active: {formatCurrency(stats?.activePrincipal || 0)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Earnings
                </p>
                <p className="text-3xl font-semibold text-green-600">
                  +{formatCurrency(stats?.totalProfit || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  From {payouts.length} completed batches
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Shares</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Layers className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {derivedMetrics?.totalShares.toFixed(2) || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {stats?.totalBatches || 0} batches
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
              <CardTitle className="text-sm font-medium">
                Cash Received
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <Banknote className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.totalCashout || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total withdrawn to date
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
              <CardTitle className="text-sm font-medium">Reinvested</CardTitle>
              <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats?.totalReinvested || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Compounding your returns
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
                Active Batches
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeInvestments || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.activePrincipal
                  ? `${formatCurrency(stats.activePrincipal)} at work`
                  : "No active investments"}
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
                <BarChart3 className="h-5 w-5 text-primary" />
                Profit Growth
              </CardTitle>
              <CardDescription>
                Your cumulative earnings over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profitChartData.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={profitChartData}>
                      <defs>
                        <linearGradient
                          id="profitGradient"
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
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
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
                        formatter={(value: number) => [
                          formatCurrency(value),
                          "Cumulative Profit",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#profitGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No profit data yet</p>
                    <p className="text-sm">
                      Complete your first batch to see trends
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Investment Breakdown Pie Chart */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                Investment Breakdown
              </CardTitle>
              <CardDescription>How your money is distributed</CardDescription>
            </CardHeader>
            <CardContent>
              {sourceBreakdown.length > 0 ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sourceBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {sourceBreakdown.map((entry, index) => (
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
                      {sourceBreakdown.map((item, index) => (
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
                    <PiggyBank className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No investments yet</p>
                    <p className="text-sm">Make your first contribution</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Batch Performance Chart */}
      {batchPerformance.length > 0 && (
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.45 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                Batch Performance & Money Flow
              </CardTitle>
              <CardDescription>
                See your returns and how the money was distributed from each
                batch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-600 mb-1">
                      Total Principal
                    </p>
                    <p className="font-bold text-blue-600">
                      {formatCurrency(
                        batchPerformance.reduce(
                          (sum, b) => sum + b.principal,
                          0
                        )
                      )}
                    </p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 mb-1">Total Profit</p>
                    <p className="font-bold text-green-600">
                      +
                      {formatCurrency(
                        batchPerformance.reduce((sum, b) => sum + b.profit, 0)
                      )}
                    </p>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                    <p className="text-xs text-purple-600 mb-1">
                      Total Reinvested
                    </p>
                    <p className="font-bold text-purple-600">
                      {formatCurrency(
                        batchPerformance.reduce(
                          (sum, b) => sum + b.reinvested,
                          0
                        )
                      )}
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                    <p className="text-xs text-emerald-600 mb-1">
                      Total Cashed Out
                    </p>
                    <p className="font-bold text-emerald-600">
                      {formatCurrency(
                        batchPerformance.reduce((sum, b) => sum + b.cashout, 0)
                      )}
                    </p>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={batchPerformance} layout="vertical">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) =>
                          `৳${(value / 1000).toFixed(0)}k`
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string) => {
                          const labels: Record<string, string> = {
                            profit: "Profit Earned",
                            reinvested: "Reinvested",
                            cashout: "Cashed Out",
                          };
                          return [formatCurrency(value), labels[name] || name];
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="profit"
                        name="Profit"
                        fill="#22c55e"
                        radius={[0, 4, 4, 0]}
                        stackId="outcome"
                      />
                      <Bar
                        dataKey="reinvested"
                        name="Reinvested"
                        fill="#a855f7"
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar
                        dataKey="cashout"
                        name="Cashed Out"
                        fill="#10b981"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* My Contributions */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-blue-500" />
                My Contributions
              </CardTitle>
              <CardDescription>
                Your investment history across all batches
              </CardDescription>
            </div>
            {contributions.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {contributions.length} total
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {contributions.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <PiggyBank className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">
                  No contributions yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Your investments will appear here
                </p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributions.map((c) => (
                      <TableRow key={c.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                              {c.batch?.name?.slice(0, 2) || "?"}
                            </div>
                            <span className="font-medium">
                              {c.batch?.name || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(c.amount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {parseFloat(c.shares || "0").toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={
                                c.source === "REINVEST"
                                  ? "secondary"
                                  : "default"
                              }
                              className={
                                c.source === "CASH"
                                  ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                                  : "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20"
                              }
                            >
                              {c.source === "CASH" ? (
                                <>
                                  <Banknote className="h-3 w-3 mr-1" /> Cash
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1" />{" "}
                                  Reinvest
                                </>
                              )}
                            </Badge>
                            {c.reinvestment && (
                              <span className="text-xs text-muted-foreground">
                                from{" "}
                                {c.reinvestment.sourceBatch?.name ||
                                  "Previous Batch"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(c.date)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* My Payouts */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.55 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5 text-green-500" />
                Batch Outcomes
              </CardTitle>
              <CardDescription>
                See how your money moved from each completed batch
              </CardDescription>
            </div>
            {payouts.length > 0 && (
              <Badge
                variant="outline"
                className="ml-auto bg-green-500/10 text-green-600"
              >
                {formatCurrency(stats?.totalProfit || 0)} total profit
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">
                  No payouts yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Payouts appear when batches complete
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {payouts.map((p) => {
                  const grossPayout = parseFloat(p.grossPayout || "0");
                  const reinvestedAmount = parseFloat(p.reinvested || "0");
                  const cashoutAmount = parseFloat(p.cashout || "0");
                  const principal = parseFloat(p.principal || "0");
                  const profit = parseFloat(p.profit || "0");

                  const reinvestPercent =
                    grossPayout > 0
                      ? (reinvestedAmount / grossPayout) * 100
                      : 0;
                  const cashoutPercent =
                    grossPayout > 0 ? (cashoutAmount / grossPayout) * 100 : 0;

                  const isFullyReinvested = reinvestPercent >= 99.9;
                  const isFullyCashedOut = cashoutPercent >= 99.9;
                  const isSplit =
                    !isFullyReinvested &&
                    !isFullyCashedOut &&
                    reinvestedAmount > 0 &&
                    cashoutAmount > 0;

                  return (
                    <div
                      key={p.id}
                      className={`rounded-lg border p-4 transition-all hover:shadow-md ${
                        isFullyReinvested
                          ? "border-purple-500/30 bg-purple-500/5"
                          : isFullyCashedOut
                            ? "border-green-500/30 bg-green-500/5"
                            : "border-border"
                      }`}
                    >
                      {/* Header with batch name and status */}
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
                            {p.batch?.name?.slice(0, 2) || "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-lg">
                              {p.batch?.name || "Unknown Batch"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Completed {formatDate(p.date)}
                            </p>
                          </div>
                        </div>
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
                              <Banknote className="h-3 w-3 mr-1" /> Fully Cashed
                              Out
                            </>
                          )}
                          {isSplit && (
                            <>
                              <Activity className="h-3 w-3 mr-1" /> Split Payout
                            </>
                          )}
                          {!isFullyReinvested &&
                            !isFullyCashedOut &&
                            !isSplit &&
                            reinvestedAmount === 0 &&
                            cashoutAmount === 0 && <>Pending</>}
                        </Badge>
                      </div>

                      {/* Financial breakdown */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">
                            Principal
                          </p>
                          <p className="font-semibold">
                            {formatCurrency(principal)}
                          </p>
                        </div>
                        <div className="bg-green-500/10 rounded-lg p-3 text-center">
                          <p className="text-xs text-green-600 mb-1 flex items-center justify-center gap-1">
                            <TrendingUp className="h-3 w-3" /> Profit
                          </p>
                          <p className="font-semibold text-green-600">
                            +{formatCurrency(profit)}
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
                      </div>

                      {/* Distribution visual bar */}
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

                      {/* Reinvestment destination */}
                      {p.reinvestments && p.reinvestments.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-dashed">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" /> Money moved to:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {p.reinvestments.map((r) => (
                              <Badge
                                key={r.id}
                                variant="outline"
                                className="bg-purple-500/10 text-purple-600 border-purple-500/30 py-1.5"
                              >
                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                {r.targetBatch?.name || "New Batch"}
                                <span className="ml-1 text-purple-400">
                                  (
                                  {formatCurrency(r.amount || reinvestedAmount)}
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

      {/* Quick Stats Footer */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.6 }}
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
                  {formatCurrency(derivedMetrics?.cashContributions || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reinvested</p>
                <p className="text-xl font-bold">
                  {formatCurrency(derivedMetrics?.reinvestContributions || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Percent className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Return on Investment
                </p>
                <p className="text-xl font-bold text-green-600">
                  +{derivedMetrics?.roi.toFixed(1) || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
