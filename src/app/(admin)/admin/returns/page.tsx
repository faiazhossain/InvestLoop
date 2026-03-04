"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Return, Batch } from "@/types";
import { Plus } from "lucide-react";

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [closedBatches, setClosedBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    batchId: "",
    totalReturn: "",
    profit: "",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [returnsRes, batchesRes] = await Promise.all([
        fetch("/api/returns"),
        fetch("/api/batches"),
      ]);

      if (returnsRes.ok) {
        const data = await returnsRes.json();
        setReturns(data.returns);
      }
      if (batchesRes.ok) {
        const data = await batchesRes.json();
        // Get closed batches without returns
        const returnedBatchIds = new Set(
          data.returns.map((r: Return) => r.batchId)
        );
        setClosedBatches(
          data.batches.filter(
            (b: Batch) => b.status === "CLOSED" && !returnedBatchIds.has(b.id)
          )
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsDialogOpen(false);
        setFormData({
          batchId: "",
          totalReturn: "",
          profit: "",
          notes: "",
        });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to record return");
      }
    } catch (error) {
      console.error("Error recording return:", error);
    }
  }

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
          <h1 className="text-3xl font-bold">Returns</h1>
          <p className="text-muted-foreground">
            Record investment returns and calculate payouts
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={closedBatches.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Record Return
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Return</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch</Label>
                  <Select
                    value={formData.batchId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, batchId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {closedBatches.map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.name} ({formatCurrency(batch.principal)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalReturn">Total Return</Label>
                  <Input
                    id="totalReturn"
                    type="number"
                    step="0.01"
                    value={formData.totalReturn}
                    onChange={(e) =>
                      setFormData({ ...formData, totalReturn: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profit">Profit</Label>
                  <Input
                    id="profit"
                    type="number"
                    step="0.01"
                    value={formData.profit}
                    onChange={(e) =>
                      setFormData({ ...formData, profit: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Record Return</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recorded Returns</CardTitle>
        </CardHeader>
        <CardContent>
          {returns.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No returns recorded yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Total Return</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((ret) => {
                  const principal = parseFloat(ret.batch?.principal || "0");
                  const roi =
                    principal > 0
                      ? ((parseFloat(ret.profit) / principal) * 100).toFixed(2)
                      : "0.00";
                  return (
                    <TableRow key={ret.id}>
                      <TableCell className="font-medium">
                        {ret.batch?.name || "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(ret.totalReturn)}</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(ret.profit)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">{roi}%</Badge>
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
