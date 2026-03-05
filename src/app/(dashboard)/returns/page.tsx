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
import { TakaIcon } from "@/components/icons/taka";

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
  memberPrincipal?: number;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalMemberPrincipal = returns.reduce(
    (sum, r) => sum + (r.memberPrincipal || 0),
    0
  );
  const totalMemberProfit = returns.reduce(
    (sum, r) => sum + parseFloat(r.profit || "0") * ((r.memberPrincipal || 0) / parseFloat(r.batch?.principal || "1")),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Returns</h1>
        <p className="text-muted-foreground">
          View returns from your investments
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invested in Closed Batches
            </CardTitle>
            <TakaIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalMemberPrincipal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Profit Earned
            </CardTitle>
            <TakaIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalMemberProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Closed Batches
            </CardTitle>
            <TakaIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{returns.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Return History</CardTitle>
        </CardHeader>
        <CardContent>
          {returns.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No returns recorded for your investments yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Your Principal</TableHead>
                  <TableHead>Batch Total Return</TableHead>
                  <TableHead>Batch Profit</TableHead>
                  <TableHead>Your Profit Share</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((ret) => {
                  const batchPrincipal = parseFloat(ret.batch?.principal || "0");
                  const memberPrincipal = ret.memberPrincipal || 0;
                  const batchProfit = parseFloat(ret.profit || "0");
                  const memberProfitShare = batchPrincipal > 0
                    ? (memberPrincipal / batchPrincipal) * batchProfit
                    : 0;
                  const roi = memberPrincipal > 0
                    ? ((memberProfitShare / memberPrincipal) * 100).toFixed(2)
                    : "0.00";

                  return (
                    <TableRow key={ret.id}>
                      <TableCell className="font-medium">
                        {ret.batch?.name || "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(memberPrincipal)}</TableCell>
                      <TableCell>{formatCurrency(ret.totalReturn)}</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(batchProfit)}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {formatCurrency(memberProfitShare)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={parseFloat(roi) >= 0 ? "default" : "destructive"}>
                          {roi}%
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(ret.date)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
