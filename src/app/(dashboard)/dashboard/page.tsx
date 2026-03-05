"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { TakaIcon } from "@/components/icons/taka";

export default function MemberDashboard() {
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [userRole, setUserRole] = useState<"ADMIN" | "MEMBER" | null>(null);
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
          setUserRole(data.user?.role);
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

  // Calculate profit over time for chart
  const profitChartData = payouts.map((p) => ({
    date: formatDate(p.date),
    profit: parseFloat(p.profit),
    batch: p.batch?.name || "Unknown",
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Your investment overview and activity
          </p>
        </div>
        {userRole && (
          <Badge variant={userRole === "ADMIN" ? "default" : "outline"}>
            {userRole === "ADMIN" ? "Admin" : "Member"}
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalInvested || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.totalProfit || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cashout</CardTitle>
            <TakaIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalCashout || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Investments
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeInvestments || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Chart */}
      {profitChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Profit Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#22c55e"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Contributions */}
      <Card>
        <CardHeader>
          <CardTitle>My Contributions</CardTitle>
        </CardHeader>
        <CardContent>
          {contributions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No contributions yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.batch?.name || "-"}</TableCell>
                    <TableCell>{formatCurrency(c.amount)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={c.source === "REINVEST" ? "secondary" : "default"}
                        >
                          {c.source}
                        </Badge>
                        {c.reinvestment && (
                          <span className="text-xs text-muted-foreground">
                            from {c.reinvestment.sourceBatch?.name || "Previous Batch"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(c.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* My Payouts */}
      <Card>
        <CardHeader>
          <CardTitle>My Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No payouts yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Reinvested</TableHead>
                  <TableHead>Cashout</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.batch?.name || "-"}</TableCell>
                    <TableCell>{formatCurrency(p.principal)}</TableCell>
                    <TableCell className="text-green-600">
                      {formatCurrency(p.profit)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{formatCurrency(p.reinvested)}</span>
                        {p.reinvestments && p.reinvestments.length > 0 && (
                          <div className="flex flex-col gap-0.5">
                            {p.reinvestments.map((r) => (
                              <span key={r.id} className="text-xs text-muted-foreground">
                                to {r.targetBatch?.name || "New Batch"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(p.cashout)}
                    </TableCell>
                    <TableCell>{formatDate(p.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
