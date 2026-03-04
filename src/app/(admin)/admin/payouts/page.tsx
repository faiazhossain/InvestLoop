"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Payout, Batch } from "@/types";
import { Download } from "lucide-react";

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const batchesRes = await fetch("/api/batches");
      if (batchesRes.ok) {
        const data = await batchesRes.json();
        setBatches(data.batches);
      }
      await fetchPayouts("");
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedBatchId) {
      fetchPayouts(selectedBatchId === "all" ? "" : selectedBatchId);
    }
  }, [selectedBatchId]);

  async function fetchPayouts(batchId: string) {
    try {
      const url = batchId ? `/api/payouts?batchId=${batchId}` : "/api/payouts";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts);
      }
    } catch (error) {
      console.error("Error fetching payouts:", error);
    }
  }

  function exportToCSV() {
    const headers = [
      "Member",
      "Email",
      "Batch",
      "Principal",
      "Profit",
      "Gross Payout",
      "Reinvested",
      "Cashout",
      "Date",
    ];
    const rows = payouts.map((p) => [
      p.user?.name || "-",
      p.user?.email || "-",
      p.batch?.name || "-",
      p.principal,
      p.profit,
      p.grossPayout,
      p.reinvested,
      p.cashout,
      formatDate(p.date),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payouts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Calculate totals
  const totals = payouts.reduce(
    (acc, p) => ({
      principal: acc.principal + parseFloat(p.principal),
      profit: acc.profit + parseFloat(p.profit),
      grossPayout: acc.grossPayout + parseFloat(p.grossPayout),
      reinvested: acc.reinvested + parseFloat(p.reinvested),
      cashout: acc.cashout + parseFloat(p.cashout),
    }),
    { principal: 0, profit: 0, grossPayout: 0, reinvested: 0, cashout: 0 }
  );

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
          <h1 className="text-3xl font-bold">Payouts</h1>
          <p className="text-muted-foreground">
            View and export calculated payouts
          </p>
        </div>
        <Button onClick={exportToCSV} disabled={payouts.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.principal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.profit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Reinvested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.reinvested)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cashout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.cashout)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Filter by Batch:</span>
        <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Batches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {batches.map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>
                {batch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout Details</CardTitle>
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
                  <TableHead>Member</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Gross Payout</TableHead>
                  <TableHead>Reinvested</TableHead>
                  <TableHead>Cashout</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {payout.user?.name || "-"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payout.user?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{payout.batch?.name || "-"}</TableCell>
                    <TableCell>{formatCurrency(payout.principal)}</TableCell>
                    <TableCell className="text-green-600">
                      {formatCurrency(payout.profit)}
                    </TableCell>
                    <TableCell>{formatCurrency(payout.grossPayout)}</TableCell>
                    <TableCell>{formatCurrency(payout.reinvested)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payout.cashout)}
                    </TableCell>
                    <TableCell>{formatDate(payout.date)}</TableCell>
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
