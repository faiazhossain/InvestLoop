"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Batch, Payout } from "@/types";
import { RefreshCw, ArrowRight, Plus, CheckCircle2, Users, User, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface BatchWithPayouts extends Batch {
  return?: {
    id: string;
    totalReturn: string;
    profit: string;
  } | null;
  payouts: (Payout & { user: { id: string; name: string | null; email: string } })[];
}

interface ReinvestmentDecision {
  userId: string;
  userName: string;
  userEmail: string;
  grossPayout: string;
  alreadyReinvested: string;
  availableToReinvest: string;
  contributionRatio: number;
  decision: "REINVEST" | "WITHDRAW";
  reinvestAmount: string;
}

interface TargetBatchAllocation {
  batchId: string;
  amount: string;
  isNewBatch: boolean;
  newBatchName?: string;
  newBatchDescription?: string;
}

type ReinvestMode = "individual" | "proportional";

export default function ReinvestmentsPage() {
  const [batches, setBatches] = useState<BatchWithPayouts[]>([]);
  const [openBatches, setOpenBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchWithPayouts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [decisions, setDecisions] = useState<ReinvestmentDecision[]>([]);
  const [reinvestMode, setReinvestMode] = useState<ReinvestMode>("proportional");
  const [proportionalAmount, setProportionalAmount] = useState("");
  const [targetAllocations, setTargetAllocations] = useState<TargetBatchAllocation[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [reinvestRes, batchesRes] = await Promise.all([
        fetch("/api/reinvestments"),
        fetch("/api/batches"),
      ]);

      if (reinvestRes.ok) {
        const data = await reinvestRes.json();
        setBatches(data.batches);
      }

      if (batchesRes.ok) {
        const data = await batchesRes.json();
        setOpenBatches(data.batches.filter((b: Batch) => b.status === "OPEN"));
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

  function initializeDecisions(batch: BatchWithPayouts) {
    const totalGrossPayout = batch.payouts.reduce(
      (sum, p) => sum + parseFloat(p.grossPayout),
      0
    );

    const initialDecisions: ReinvestmentDecision[] = batch.payouts.map((payout) => {
      const grossPayout = parseFloat(payout.grossPayout);
      const alreadyReinvested = parseFloat(payout.reinvested);
      const availableToReinvest = grossPayout - alreadyReinvested;
      const contributionRatio = totalGrossPayout > 0 ? grossPayout / totalGrossPayout : 0;

      return {
        userId: payout.userId,
        userName: payout.user?.name || payout.user?.email || "Unknown",
        userEmail: payout.user?.email || "",
        grossPayout: payout.grossPayout,
        alreadyReinvested: payout.reinvested,
        availableToReinvest: availableToReinvest.toFixed(2),
        contributionRatio,
        decision: "WITHDRAW" as const,
        reinvestAmount: availableToReinvest.toFixed(2),
      };
    });
    return initialDecisions;
  }

  async function selectBatch(batch: BatchWithPayouts) {
    setSelectedBatch(batch);
    const initialDecisions = initializeDecisions(batch);
    setDecisions(initialDecisions);
    setReinvestMode("proportional");
    setProportionalAmount("");
    setTargetAllocations([]);
    setIsDialogOpen(true);
  }

  function updateDecision(userId: string, field: "decision" | "reinvestAmount", value: string) {
    setDecisions((prev) =>
      prev.map((d) => {
        if (d.userId !== userId) return d;

        if (field === "decision") {
          const newDecision = value as "REINVEST" | "WITHDRAW";
          return {
            ...d,
            decision: newDecision,
            reinvestAmount:
              newDecision === "REINVEST" ? d.availableToReinvest : "0",
          };
        }

        if (field === "reinvestAmount") {
          const amount = parseFloat(value) || 0;
          const maxAmount = parseFloat(d.availableToReinvest);
          const clampedAmount = Math.min(Math.max(0, amount), maxAmount);
          return {
            ...d,
            reinvestAmount: clampedAmount.toFixed(2),
            decision: clampedAmount > 0 ? "REINVEST" as const : "WITHDRAW" as const,
          };
        }

        return d;
      })
    );
  }

  function distributeProportionalAmount(totalAmount: number) {
    const maxAvailable = decisions.reduce(
      (sum, d) => sum + parseFloat(d.availableToReinvest),
      0
    );

    const amountToDistribute = Math.min(totalAmount, maxAvailable);

    setDecisions((prev) => {
      let remaining = amountToDistribute;
      return prev.map((d) => {
        const available = parseFloat(d.availableToReinvest);
        let memberAmount: number;

        if (remaining <= 0) {
          memberAmount = 0;
        } else {
          memberAmount = Math.min(available, remaining);
          remaining -= memberAmount;
        }

        return {
          ...d,
          reinvestAmount: memberAmount.toFixed(2),
          decision: memberAmount > 0 ? "REINVEST" as const : "WITHDRAW" as const,
        };
      });
    });
  }

  function handleProportionalAmountChange(value: string) {
    setProportionalAmount(value);
    const amount = parseFloat(value) || 0;
    distributeProportionalAmount(amount);
  }

  function selectAllReinvest() {
    setDecisions((prev) =>
      prev.map((d) => ({
        ...d,
        decision: "REINVEST" as const,
        reinvestAmount: d.availableToReinvest,
      }))
    );
  }

  function selectAllWithdraw() {
    setDecisions((prev) =>
      prev.map((d) => ({
        ...d,
        decision: "WITHDRAW" as const,
        reinvestAmount: "0",
      }))
    );
    setProportionalAmount("");
  }

  function addTargetAllocation() {
    setTargetAllocations((prev) => [
      ...prev,
      { batchId: "", amount: "", isNewBatch: false },
    ]);
  }

  function updateTargetAllocation(index: number, field: keyof TargetBatchAllocation, value: string | boolean) {
    setTargetAllocations((prev) =>
      prev.map((alloc, i) => {
        if (i !== index) return alloc;
        return { ...alloc, [field]: value };
      })
    );
  }

  function removeTargetAllocation(index: number) {
    setTargetAllocations((prev) => prev.filter((_, i) => i !== index));
  }

  const reinvestDecisions = decisions.filter(
    (d) => d.decision === "REINVEST" && parseFloat(d.reinvestAmount) > 0
  );

  const totalReinvestAmount = reinvestDecisions.reduce(
    (sum, d) => sum + parseFloat(d.reinvestAmount),
    0
  );

  const totalAvailableToReinvest = decisions.reduce(
    (sum, d) => sum + parseFloat(d.availableToReinvest),
    0
  );

  const totalAllocatedAmount = targetAllocations.reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0
  );

  const unallocatedAmount = totalReinvestAmount - totalAllocatedAmount;

  function validateAllocations(): boolean {
    if (targetAllocations.length === 0) {
      toast.error("Please add at least one target batch");
      return false;
    }

    for (let i = 0; i < targetAllocations.length; i++) {
      const alloc = targetAllocations[i];
      if (!alloc.amount || parseFloat(alloc.amount) <= 0) {
        toast.error(`Please enter an amount for allocation ${i + 1}`);
        return false;
      }

      if (alloc.isNewBatch) {
        if (!alloc.newBatchName?.trim()) {
          toast.error(`Please enter a name for new batch ${i + 1}`);
          return false;
        }
      } else {
        if (!alloc.batchId) {
          toast.error(`Please select a batch for allocation ${i + 1}`);
          return false;
        }
      }
    }

    if (Math.abs(unallocatedAmount) > 0.01) {
      toast.error(`Allocation mismatch. ${unallocatedAmount > 0 ? "Unallocated" : "Over-allocated"}: ${formatCurrency(Math.abs(unallocatedAmount))}`);
      return false;
    }

    return true;
  }

  async function handleProcessReinvestment() {
    if (!selectedBatch) return;

    if (reinvestDecisions.length === 0) {
      toast.error("No reinvestment decisions to process");
      return;
    }

    if (!validateAllocations()) return;

    setIsProcessing(true);

    try {
      // Process each target allocation as a separate reinvestment
      const results = [];
      let processedDecisions = decisions.map(d => ({ ...d }));

      for (const allocation of targetAllocations) {
        const allocAmount = parseFloat(allocation.amount);
        const ratio = allocAmount / totalReinvestAmount;

        // Calculate each member's share for this allocation
        const allocDecisions = processedDecisions
          .filter(d => d.decision === "REINVEST" && parseFloat(d.reinvestAmount) > 0)
          .map(d => {
            const memberShare = parseFloat(d.reinvestAmount) * ratio;
            return {
              userId: d.userId,
              amount: memberShare.toFixed(2),
              decision: "REINVEST" as const,
            };
          })
          .filter(d => parseFloat(d.amount) > 0);

        if (allocDecisions.length === 0) continue;

        const res = await fetch("/api/reinvestments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceBatchId: selectedBatch.id,
            targetBatchId: allocation.isNewBatch ? undefined : allocation.batchId,
            newBatchName: allocation.isNewBatch ? allocation.newBatchName : undefined,
            newBatchDescription: allocation.isNewBatch ? allocation.newBatchDescription : undefined,
            decisions: allocDecisions,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          results.push(data);
        } else {
          const data = await res.json();
          throw new Error(data.error || "Failed to process allocation");
        }
      }

      const totalProcessed = results.reduce((sum, r) => sum + parseFloat(r.totalReinvested), 0);
      toast.success(
        `Successfully processed ${results.length} allocation(s) totaling ${formatCurrency(totalProcessed)}`
      );
      setIsDialogOpen(false);
      setSelectedBatch(null);
      fetchData();
    } catch (error) {
      console.error("Error processing reinvestments:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsProcessing(false);
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
      <div>
        <h1 className="text-3xl font-bold">Reinvestments</h1>
        <p className="text-muted-foreground">
          Manage profit reinvestments from closed batches
        </p>
      </div>

      {batches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No batches available for reinvestment</h3>
            <p className="text-muted-foreground mt-2">
              Close a batch and record returns to enable reinvestments
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {batches.map((batch) => {
            const totalGrossPayout = batch.payouts.reduce(
              (sum, p) => sum + parseFloat(p.grossPayout),
              0
            );
            const totalReinvested = batch.payouts.reduce(
              (sum, p) => sum + parseFloat(p.reinvested),
              0
            );
            const availableToReinvest = totalGrossPayout - totalReinvested;

            return (
              <Card key={batch.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{batch.name}</CardTitle>
                      <CardDescription>
                        Closed on {batch.endDate ? formatDate(batch.endDate) : "N/A"}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{batch.payouts.length} members</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Principal</p>
                      <p className="font-semibold">{formatCurrency(batch.principal)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profit</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(batch.profit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Payout</p>
                      <p className="font-semibold">{formatCurrency(totalGrossPayout)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Available to Reinvest</p>
                      <p className={`font-semibold ${availableToReinvest > 0 ? "text-blue-600" : ""}`}>
                        {formatCurrency(availableToReinvest)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => selectBatch(batch)}
                      disabled={availableToReinvest <= 0}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Manage Reinvestments
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reinvestment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Reinvestments - {selectedBatch?.name}</DialogTitle>
            <DialogDescription>
              Choose how to distribute reinvestment among members and target batches.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Mode Tabs */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant={reinvestMode === "proportional" ? "default" : "ghost"}
                onClick={() => setReinvestMode("proportional")}
                className="flex-1"
              >
                <Users className="h-4 w-4 mr-2" />
                Proportional (All Agree)
              </Button>
              <Button
                variant={reinvestMode === "individual" ? "default" : "ghost"}
                onClick={() => setReinvestMode("individual")}
                className="flex-1"
              >
                <User className="h-4 w-4 mr-2" />
                Individual Decisions
              </Button>
            </div>

            {/* Proportional Mode */}
            {reinvestMode === "proportional" && (
              <div className="space-y-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="proportionalAmount" className="text-base font-medium">
                          Total Amount to Reinvest
                        </Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Enter total amount - it will be distributed proportionally among all members
                        </p>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="proportionalAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            max={totalAvailableToReinvest}
                            value={proportionalAmount}
                            onChange={(e) => handleProportionalAmountChange(e.target.value)}
                            placeholder="Enter amount"
                            className="text-lg"
                          />
                          <Button
                            variant="outline"
                            onClick={() => handleProportionalAmountChange(totalAvailableToReinvest.toString())}
                          >
                            Max ({formatCurrency(totalAvailableToReinvest)})
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Payout</p>
                          <p className="font-semibold">{formatCurrency(totalAvailableToReinvest)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Reinvesting</p>
                          <p className="font-semibold text-blue-600">{formatCurrency(totalReinvestAmount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Withdrawing</p>
                          <p className="font-semibold">{formatCurrency(totalAvailableToReinvest - totalReinvestAmount)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview Table */}
                <div>
                  <h4 className="font-medium mb-2">Distribution Preview</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead className="text-right">Share %</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right">Reinvesting</TableHead>
                        <TableHead className="text-right">Withdrawing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {decisions.map((decision) => (
                        <TableRow key={decision.userId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{decision.userName}</p>
                              <p className="text-sm text-muted-foreground">
                                {decision.userEmail}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {(decision.contributionRatio * 100).toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(decision.availableToReinvest)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-blue-600">
                            {formatCurrency(decision.reinvestAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              parseFloat(decision.availableToReinvest) - parseFloat(decision.reinvestAmount)
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Individual Mode */}
            {reinvestMode === "individual" && (
              <>
                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllReinvest}>
                    Select All Reinvest
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectAllWithdraw}>
                    Select All Withdraw
                  </Button>
                </div>

                {/* Member Decisions Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-right">Gross Payout</TableHead>
                      <TableHead className="text-right">Already Reinvested</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-center">Decision</TableHead>
                      <TableHead className="text-right">Reinvest Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {decisions.map((decision) => (
                      <TableRow key={decision.userId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{decision.userName}</p>
                            <p className="text-sm text-muted-foreground">
                              {decision.userEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(decision.grossPayout)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(decision.alreadyReinvested)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(decision.availableToReinvest)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant={decision.decision === "REINVEST" ? "default" : "outline"}
                              size="sm"
                              onClick={() =>
                                updateDecision(decision.userId, "decision", "REINVEST")
                              }
                            >
                              Reinvest
                            </Button>
                            <Button
                              variant={decision.decision === "WITHDRAW" ? "default" : "outline"}
                              size="sm"
                              onClick={() =>
                                updateDecision(decision.userId, "decision", "WITHDRAW")
                              }
                            >
                              Withdraw
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={decision.availableToReinvest}
                            value={decision.reinvestAmount}
                            onChange={(e) =>
                              updateDecision(decision.userId, "reinvestAmount", e.target.value)
                            }
                            disabled={decision.decision === "WITHDRAW"}
                            className="w-28 ml-auto"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}

            {/* Target Batches Allocation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Target Batch Allocations</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addTargetAllocation}
                  disabled={totalReinvestAmount === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Batch
                </Button>
              </div>

              {targetAllocations.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      Add target batches to allocate the reinvestment
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You can split the total across multiple batches
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {targetAllocations.map((allocation, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-4">
                            <div className="flex gap-2">
                              <Button
                                variant={!allocation.isNewBatch ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateTargetAllocation(index, "isNewBatch", false)}
                              >
                                Existing Batch
                              </Button>
                              <Button
                                variant={allocation.isNewBatch ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateTargetAllocation(index, "isNewBatch", true)}
                              >
                                New Batch
                              </Button>
                            </div>

                            {allocation.isNewBatch ? (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Batch Name</Label>
                                  <Input
                                    value={allocation.newBatchName || ""}
                                    onChange={(e) =>
                                      updateTargetAllocation(index, "newBatchName", e.target.value)
                                    }
                                    placeholder="e.g., Batch Q2 2024"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Input
                                    value={allocation.newBatchDescription || ""}
                                    onChange={(e) =>
                                      updateTargetAllocation(index, "newBatchDescription", e.target.value)
                                    }
                                    placeholder="Optional"
                                  />
                                </div>
                              </div>
                            ) : (
                              <Select
                                value={allocation.batchId}
                                onValueChange={(value) =>
                                  updateTargetAllocation(index, "batchId", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select target batch" />
                                </SelectTrigger>
                                <SelectContent>
                                  {openBatches.map((batch) => (
                                    <SelectItem key={batch.id} value={batch.id}>
                                      {batch.name} ({formatCurrency(batch.principal)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            <div className="space-y-2">
                              <Label>Amount to Allocate</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={totalReinvestAmount}
                                  value={allocation.amount}
                                  onChange={(e) =>
                                    updateTargetAllocation(index, "amount", e.target.value)
                                  }
                                  placeholder="Enter amount"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const remaining = totalReinvestAmount - totalAllocatedAmount + parseFloat(allocation.amount || "0");
                                    updateTargetAllocation(index, "amount", remaining.toString());
                                  }}
                                >
                                  Remaining
                                </Button>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTargetAllocation(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Allocation Summary */}
              {targetAllocations.length > 0 && (
                <Card className={unallocatedAmount === 0 ? "bg-green-50 border-green-200" : unallocatedAmount > 0 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total to Reinvest</p>
                        <p className="font-semibold">{formatCurrency(totalReinvestAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Allocated</p>
                        <p className="font-semibold">{formatCurrency(totalAllocatedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {unallocatedAmount >= 0 ? "Unallocated" : "Over-allocated"}
                        </p>
                        <p className={`font-semibold ${unallocatedAmount === 0 ? "text-green-600" : unallocatedAmount > 0 ? "text-yellow-600" : "text-red-600"}`}>
                          {formatCurrency(Math.abs(unallocatedAmount))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessReinvestment}
              disabled={isProcessing || reinvestDecisions.length === 0 || targetAllocations.length === 0 || unallocatedAmount !== 0}
            >
              {isProcessing ? (
                "Processing..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Process {targetAllocations.length} Allocation(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
