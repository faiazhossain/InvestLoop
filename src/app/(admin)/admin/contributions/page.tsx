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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Contribution, Batch, User } from "@/types";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

type FormMode = "create" | "edit";

export default function ContributionsPage() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [filteredContributions, setFilteredContributions] = useState<
    Contribution[]
  >([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [selectedContribution, setSelectedContribution] =
    useState<Contribution | null>(null);
  const [contributionToDelete, setContributionToDelete] =
    useState<Contribution | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    userId: "",
    batchId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [equalAmountForm, setEqualAmountForm] = useState({
    batchId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [equalFormErrors, setEqualFormErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    fetchData();
  }, []);

  const filterContributions = useCallback(() => {
    let filtered = [...contributions];

    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.batch?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (memberFilter !== "ALL") {
      filtered = filtered.filter((c) => c.userId === memberFilter);
    }

    if (batchFilter !== "ALL") {
      filtered = filtered.filter((c) => c.batchId === batchFilter);
    }

    setFilteredContributions(filtered);
  }, [contributions, searchQuery, memberFilter, batchFilter]);

  useEffect(() => {
    filterContributions();
  }, [filterContributions]);

  async function fetchData() {
    try {
      const [contributionsRes, batchesRes, membersRes] = await Promise.all([
        fetch("/api/contributions"),
        fetch("/api/batches"),
        fetch("/api/members"),
      ]);

      if (contributionsRes.ok) {
        const data = await contributionsRes.json();
        setContributions(data.contributions);
      } else {
        toast.error("Failed to load contributions");
      }
      if (batchesRes.ok) {
        const data = await batchesRes.json();
        setAllBatches(data.batches);
        setBatches(data.batches.filter((b: Batch) => b.status === "OPEN"));
      } else {
        toast.error("Failed to load batches");
      }
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members.filter((m: User) => m.isActive));
      } else {
        toast.error("Failed to load members");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error loading data");
    } finally {
      setIsLoading(false);
    }
  }

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!formData.userId) errors.userId = "Member is required";
    if (!formData.batchId) errors.batchId = "Batch is required";
    if (!formData.amount || Number(formData.amount) <= 0) {
      errors.amount = "Amount must be greater than 0";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function resetForm() {
    setFormData({
      userId: "",
      batchId: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setFormErrors({});
    setSelectedContribution(null);
    setEqualAmountForm({
      batchId: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setSelectedMembers([]);
    setEqualFormErrors({});
  }

  function openCreateDialog() {
    resetForm();
    setFormMode("create");
    setIsDialogOpen(true);
  }

  function openEditDialog(contribution: Contribution) {
    setFormData({
      userId: contribution.userId,
      batchId: contribution.batchId,
      amount: contribution.amount.toString(),
      date: new Date(contribution.date).toISOString().split("T")[0],
      notes: contribution.notes || "",
    });
    setSelectedContribution(contribution);
    setFormMode("edit");
    setFormErrors({});
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix form errors");
      return;
    }

    setIsSubmitting(true);

    try {
      const url =
        formMode === "create"
          ? "/api/contributions"
          : `/api/contributions/${selectedContribution?.id}`;
      const method = formMode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(
          formMode === "create"
            ? "Contribution added successfully"
            : "Contribution updated successfully"
        );
        setIsDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Operation failed");
      }
    } catch (error) {
      console.error("Error submitting contribution:", error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!contributionToDelete) return;

    try {
      const res = await fetch(`/api/contributions/${contributionToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Contribution deleted successfully");
        setIsDeleteDialogOpen(false);
        setContributionToDelete(null);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting contribution:", error);
      toast.error("An error occurred");
    }
  }

  function validateEqualForm() {
    const errors: Record<string, string> = {};

    if (!equalAmountForm.batchId) errors.batchId = "Batch is required";
    if (!equalAmountForm.amount || Number(equalAmountForm.amount) <= 0) {
      errors.amount = "Amount must be greater than 0";
    }
    if (selectedMembers.length === 0) {
      errors.members = "Select at least one member";
    }

    setEqualFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function toggleMember(memberId: string) {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }

  function toggleAllMembers() {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map((m) => m.id));
    }
  }

  async function handleEqualSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateEqualForm()) {
      toast.error("Please fix form errors");
      return;
    }

    setIsSubmitting(true);

    try {
      const contributionsData = selectedMembers.map((userId) => ({
        userId,
        batchId: equalAmountForm.batchId,
        amount: equalAmountForm.amount,
        date: equalAmountForm.date,
        notes: equalAmountForm.notes,
      }));

      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributions: contributionsData }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Added contributions for ${data.count} members (${formatCurrency(Number(data.totalAmount))})`
        );
        setIsDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add contributions");
      }
    } catch (error) {
      console.error("Error submitting equal contributions:", error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contributions</h1>
          <p className="text-muted-foreground">Manage member contributions</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contribution
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search member or batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={memberFilter} onValueChange={setMemberFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Members</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Batches</SelectItem>
                {allBatches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className={formMode === "edit" ? "max-w-md" : "max-w-lg"}
        >
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Add Contribution" : "Edit Contribution"}
            </DialogTitle>
          </DialogHeader>
          {formMode === "edit" ? (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="member">Member *</Label>
                  <Select
                    value={formData.userId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, userId: value })
                    }
                    disabled={formMode === "edit"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.userId && (
                    <p className="text-sm text-destructive">
                      {formErrors.userId}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch *</Label>
                  <Select
                    value={formData.batchId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, batchId: value })
                    }
                    disabled={formMode === "edit"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.batchId && (
                    <p className="text-sm text-destructive">
                      {formErrors.batchId}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                  />
                  {formErrors.amount && (
                    <p className="text-sm text-destructive">
                      {formErrors.amount}
                    </p>
                  )}
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
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <Tabs defaultValue="individual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="individual">Individual</TabsTrigger>
                <TabsTrigger value="equal">Equal Amount</TabsTrigger>
              </TabsList>
              <TabsContent value="individual">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="member">Member *</Label>
                      <Select
                        value={formData.userId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, userId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name || member.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.userId && (
                        <p className="text-sm text-destructive">
                          {formErrors.userId}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batch">Batch *</Label>
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
                          {batches.map((batch) => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.batchId && (
                        <p className="text-sm text-destructive">
                          {formErrors.batchId}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                      />
                      {formErrors.amount && (
                        <p className="text-sm text-destructive">
                          {formErrors.amount}
                        </p>
                      )}
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
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : "Add"}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>
              <TabsContent value="equal">
                <form onSubmit={handleEqualSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="batch-equal">Batch *</Label>
                      <Select
                        value={equalAmountForm.batchId}
                        onValueChange={(value) =>
                          setEqualAmountForm({
                            ...equalAmountForm,
                            batchId: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select batch" />
                        </SelectTrigger>
                        <SelectContent>
                          {batches.map((batch) => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {equalFormErrors.batchId && (
                        <p className="text-sm text-destructive">
                          {equalFormErrors.batchId}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount-equal">Amount per Member *</Label>
                      <Input
                        id="amount-equal"
                        type="number"
                        step="0.01"
                        value={equalAmountForm.amount}
                        onChange={(e) =>
                          setEqualAmountForm({
                            ...equalAmountForm,
                            amount: e.target.value,
                          })
                        }
                      />
                      {equalFormErrors.amount && (
                        <p className="text-sm text-destructive">
                          {equalFormErrors.amount}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Select Members *</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={toggleAllMembers}
                        >
                          {selectedMembers.length === members.length
                            ? "Deselect All"
                            : "Select All"}
                        </Button>
                      </div>
                      <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center space-x-2 py-1"
                          >
                            <Checkbox
                              id={`member-${member.id}`}
                              checked={selectedMembers.includes(member.id)}
                              onCheckedChange={() => toggleMember(member.id)}
                            />
                            <label
                              htmlFor={`member-${member.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {member.name || member.email}
                            </label>
                          </div>
                        ))}
                      </div>
                      {equalFormErrors.members && (
                        <p className="text-sm text-destructive">
                          {equalFormErrors.members}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {selectedMembers.length} member(s) selected - Total:{" "}
                        {formatCurrency(
                          Number(equalAmountForm.amount || 0) *
                            selectedMembers.length
                        )}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date-equal">Date</Label>
                      <Input
                        id="date-equal"
                        type="date"
                        value={equalAmountForm.date}
                        onChange={(e) =>
                          setEqualAmountForm({
                            ...equalAmountForm,
                            date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes-equal">Notes</Label>
                      <Input
                        id="notes-equal"
                        value={equalAmountForm.notes}
                        onChange={(e) =>
                          setEqualAmountForm({
                            ...equalAmountForm,
                            notes: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting
                        ? "Adding..."
                        : `Add for ${selectedMembers.length} Members`}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contribution</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contribution of{" "}
              <strong>
                {formatCurrency(contributionToDelete?.amount || 0)}
              </strong>{" "}
              from{" "}
              <strong>
                {contributionToDelete?.user?.name ||
                  contributionToDelete?.user?.email}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Contributions ({filteredContributions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredContributions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {searchQuery || memberFilter !== "ALL" || batchFilter !== "ALL"
                ? "No contributions found"
                : "No contributions yet"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContributions.map((contribution) => (
                  <TableRow key={contribution.id}>
                    <TableCell>
                      {contribution.user?.name ||
                        contribution.user?.email ||
                        "-"}
                    </TableCell>
                    <TableCell>{contribution.batch?.name || "-"}</TableCell>
                    <TableCell>{formatCurrency(contribution.amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          contribution.source === "REINVEST"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {contribution.source}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(contribution.date)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(contribution)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setContributionToDelete(contribution);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
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
