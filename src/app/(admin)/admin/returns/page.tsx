"use client";

export const dynamic = "force-dynamic";

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
  DialogDescription,
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
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

type FormMode = "create" | "edit";

interface ReturnWithBatch extends Return {
  batch?: Batch;
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnWithBatch[]>([]);
  const [closedBatches, setClosedBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnWithBatch | null>(
    null
  );
  const [returnToDelete, setReturnToDelete] = useState<ReturnWithBatch | null>(
    null
  );
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBatchPrincipal, setSelectedBatchPrincipal] =
    useState<number>(0);
  const [formData, setFormData] = useState({
    batchId: "",
    totalReturn: "",
    profit: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
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
        const returnedBatchIds = new Set(
          data.returns?.map((r: Return) => r.batchId) || []
        );
        setClosedBatches(
          data.batches.filter((b: Batch) => !returnedBatchIds.has(b.id))
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculatedProfit = (): number => {
    const totalReturn = parseFloat(formData.totalReturn) || 0;
    const principal =
      formMode === "create"
        ? selectedBatchPrincipal
        : parseFloat(selectedReturn?.batch?.principal || "0");
    return totalReturn - principal;
  };

  function resetForm() {
    setFormData({
      batchId: "",
      totalReturn: "",
      profit: "",
      notes: "",
      date: new Date().toISOString().split("T")[0],
    });
    setSelectedReturn(null);
    setSelectedBatchPrincipal(0);
  }

  function openCreateDialog() {
    resetForm();
    setFormMode("create");
    setIsDialogOpen(true);
  }

  function openEditDialog(ret: ReturnWithBatch) {
    setSelectedReturn(ret);
    setSelectedBatchPrincipal(parseFloat(ret.batch?.principal || "0"));
    setFormData({
      batchId: ret.batchId,
      totalReturn: ret.totalReturn,
      profit: ret.profit,
      notes: ret.notes || "",
      date: new Date(ret.date).toISOString().split("T")[0],
    });
    setFormMode("edit");
    setIsDialogOpen(true);
  }

  function openDeleteDialog(ret: ReturnWithBatch) {
    setReturnToDelete(ret);
    setIsDeleteDialogOpen(true);
  }

  function handleBatchChange(batchId: string) {
    const batch = closedBatches.find((b) => b.id === batchId);
    const principal = batch ? parseFloat(batch.principal) : 0;
    setSelectedBatchPrincipal(principal);
    setFormData({ ...formData, batchId });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const profit = calculatedProfit();

    try {
      const url =
        formMode === "create"
          ? "/api/returns"
          : `/api/returns/${selectedReturn?.id}`;
      const method = formMode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          profit: profit.toString(),
        }),
      });

      if (res.ok) {
        toast.success(
          formMode === "create"
            ? "Return recorded successfully"
            : "Return updated successfully"
        );
        setIsDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Operation failed");
      }
    } catch (error) {
      console.error("Error submitting return:", error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!returnToDelete) return;

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/returns/${returnToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Return deleted successfully");
        setIsDeleteDialogOpen(false);
        setReturnToDelete(null);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete return");
      }
    } catch (error) {
      console.error("Error deleting return:", error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const profit = calculatedProfit();
  const isProfit = profit >= 0;

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
            <Button
              onClick={openCreateDialog}
              disabled={closedBatches.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Record Return
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {formMode === "create" ? "Record Return" : "Edit Return"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {formMode === "create" && (
                  <div className="space-y-2">
                    <Label htmlFor="batch">Batch</Label>
                    <Select
                      value={formData.batchId}
                      onValueChange={handleBatchChange}
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
                )}
                {formMode === "edit" && selectedReturn && (
                  <div className="space-y-2">
                    <Label>Batch</Label>
                    <div className="text-sm font-medium p-2 border rounded bg-muted">
                      {selectedReturn.batch?.name || "Unknown Batch"}
                    </div>
                  </div>
                )}
                {(formMode === "create" ? formData.batchId : true) && (
                  <div className="space-y-2">
                    <Label>Batch Principal</Label>
                    <div className="text-sm font-medium p-2 border rounded bg-muted">
                      {formatCurrency(
                        formMode === "create"
                          ? selectedBatchPrincipal
                          : parseFloat(selectedReturn?.batch?.principal || "0")
                      )}
                    </div>
                  </div>
                )}
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
                  <Label htmlFor="profit">{isProfit ? "Profit" : "Loss"}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="profit"
                      value={formatCurrency(Math.abs(profit))}
                      readOnly
                      className="bg-muted"
                    />
                    <div
                      className={`flex items-center gap-1 ${isProfit ? "text-green-600" : "text-red-600"}`}
                    >
                      {isProfit ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                      <span className="text-sm font-medium">
                        {isProfit ? "Profit" : "Loss"}
                      </span>
                    </div>
                  </div>
                  <p
                    className={`text-xs ${isProfit ? "text-green-600" : "text-red-600"}`}
                  >
                    {isProfit
                      ? `Profit = Total Return - Principal = ${formatCurrency(Math.abs(profit))}`
                      : `Loss = Principal - Total Return = ${formatCurrency(Math.abs(profit))}`}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : formMode === "create"
                      ? "Record Return"
                      : "Update Return"}
                </Button>
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
                  <TableHead>Principal</TableHead>
                  <TableHead>Total Return</TableHead>
                  <TableHead>Profit/Loss</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((ret) => {
                  const principal = parseFloat(ret.batch?.principal || "0");
                  const profitValue = parseFloat(ret.profit || "0");
                  const isProfitRow = profitValue >= 0;
                  const roi =
                    principal > 0
                      ? ((profitValue / principal) * 100).toFixed(2)
                      : "0.00";
                  return (
                    <TableRow key={ret.id}>
                      <TableCell className="font-medium">
                        {ret.batch?.name || "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(principal)}</TableCell>
                      <TableCell>{formatCurrency(ret.totalReturn)}</TableCell>
                      <TableCell
                        className={
                          isProfitRow ? "text-green-600" : "text-red-600"
                        }
                      >
                        <div className="flex items-center gap-1">
                          {isProfitRow ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {formatCurrency(Math.abs(profitValue))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isProfitRow ? "default" : "destructive"}
                        >
                          {isProfitRow ? "+" : "-"}
                          {Math.abs(parseFloat(roi))}%
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(ret.date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(ret)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(ret)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Return</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this return for batch{" "}
              <strong>{returnToDelete?.batch?.name}</strong>? This will also
              delete all associated payouts and reopen the batch. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
