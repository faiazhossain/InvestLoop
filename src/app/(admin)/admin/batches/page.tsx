"use client";

import { useEffect, useState } from "react";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { Batch, BatchStatus } from "@/types";
import { Plus, Eye, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

type BatchWithCounts = Batch & {
  _count?: { contributions: number; payouts: number };
};

type FormMode = "create" | "edit";

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchWithCounts[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<BatchWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchWithCounts | null>(
    null,
  );
  const [batchToDelete, setBatchToDelete] = useState<BatchWithCounts | null>(
    null,
  );
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    status: "OPEN" as BatchStatus,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    filterBatches();
  }, [batches, searchQuery, statusFilter]);

  function filterBatches() {
    let filtered = [...batches];

    if (searchQuery) {
      filtered = filtered.filter((batch) =>
        batch.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((batch) => batch.status === statusFilter);
    }

    setFilteredBatches(filtered);
  }

  async function fetchBatches() {
    try {
      const res = await fetch("/api/batches");
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches);
        setFilteredBatches(data.batches);
      } else {
        toast.error("Failed to load batches");
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast.error("Error loading batches");
    } finally {
      setIsLoading(false);
    }
  }

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.startDate) {
      errors.startDate = "Start date is required";
    }

    if (formData.endDate && formData.startDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        errors.endDate = "End date must be after start date";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
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
          ? "/api/batches"
          : `/api/batches/${selectedBatch?.id}`;
      const method = formMode === "create" ? "POST" : "PATCH";

      const body: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || null,
        startDate: formData.startDate,
        status: formData.status,
      };

      if (formData.endDate) {
        body.endDate = formData.endDate;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(
          formMode === "create"
            ? "Batch created successfully"
            : "Batch updated successfully",
        );
        setIsDialogOpen(false);
        resetForm();
        fetchBatches();
      } else {
        const data = await res.json();
        toast.error(data.error || "Operation failed");
      }
    } catch (error) {
      console.error("Error submitting batch:", error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openCreateDialog() {
    resetForm();
    setFormMode("create");
    setIsDialogOpen(true);
  }

  function openEditDialog(batch: BatchWithCounts) {
    setFormData({
      name: batch.name,
      description: batch.description || "",
      startDate: new Date(batch.startDate).toISOString().split("T")[0],
      endDate: batch.endDate
        ? new Date(batch.endDate).toISOString().split("T")[0]
        : "",
      status: batch.status,
    });
    setSelectedBatch(batch);
    setFormMode("edit");
    setFormErrors({});
    setIsDialogOpen(true);
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      status: "OPEN",
    });
    setFormErrors({});
    setSelectedBatch(null);
  }

  async function handleDelete() {
    if (!batchToDelete) return;

    try {
      const res = await fetch(`/api/batches/${batchToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Batch deleted successfully");
        setIsDeleteDialogOpen(false);
        setBatchToDelete(null);
        fetchBatches();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete batch");
      }
    } catch (error) {
      console.error("Error deleting batch:", error);
      toast.error("An error occurred while deleting");
    }
  }

  async function closeBatch(batchId: string) {
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      if (res.ok) {
        toast.success("Batch closed successfully");
        fetchBatches();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to close batch");
      }
    } catch (error) {
      console.error("Error closing batch:", error);
      toast.error("An error occurred");
    }
  }

  async function openDetailsDialog(batch: BatchWithCounts) {
    try {
      const res = await fetch(`/api/batches/${batch.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedBatch(data.batch);
      } else {
        toast.error("Failed to load batch details");
      }
    } catch (error) {
      console.error("Error fetching batch details:", error);
      toast.error("Error loading details");
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Batches</h1>
          <p className='text-muted-foreground'>Manage investment batches</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className='h-4 w-4 mr-2' />
          Create Batch
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className='pt-6'>
          <div className='flex gap-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search batches...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-10'
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder='Filter by status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>All Status</SelectItem>
                <SelectItem value='OPEN'>Open</SelectItem>
                <SelectItem value='CLOSED'>Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Batches ({filteredBatches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBatches.length === 0 ? (
            <p className='text-muted-foreground text-center py-4'>
              {searchQuery || statusFilter !== "ALL"
                ? "No batches found"
                : "No batches yet"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Contributions</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className='font-medium'>{batch.name}</TableCell>
                    <TableCell>{formatCurrency(batch.principal)}</TableCell>
                    <TableCell className='text-green-600'>
                      {formatCurrency(batch.profit)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          batch.status === "OPEN" ? "default" : "secondary"
                        }
                      >
                        {batch.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(batch.startDate)}</TableCell>
                    <TableCell>{batch._count?.contributions || 0}</TableCell>
                    <TableCell>
                      <div className='flex justify-end gap-2'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => openDetailsDialog(batch)}
                        >
                          <Eye className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => openEditDialog(batch)}
                        >
                          <Pencil className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => {
                            setBatchToDelete(batch);
                            setIsDeleteDialogOpen(true);
                          }}
                          className='text-destructive hover:text-destructive'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                        {batch.status === "OPEN" && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => closeBatch(batch.id)}
                          >
                            Close
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Create New Batch" : "Edit Batch"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>Name *</Label>
                <Input
                  id='name'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='Q1 2024 Batch'
                />
                {formErrors.name && (
                  <p className='text-sm text-destructive'>{formErrors.name}</p>
                )}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='description'>Description</Label>
                <Input
                  id='description'
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder='Optional description'
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='startDate'>Start Date *</Label>
                  <Input
                    id='startDate'
                    type='date'
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                  />
                  {formErrors.startDate && (
                    <p className='text-sm text-destructive'>
                      {formErrors.startDate}
                    </p>
                  )}
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='endDate'>End Date</Label>
                  <Input
                    id='endDate'
                    type='date'
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                  {formErrors.endDate && (
                    <p className='text-sm text-destructive'>
                      {formErrors.endDate}
                    </p>
                  )}
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='status'>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: BatchStatus) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='OPEN'>Open</SelectItem>
                    <SelectItem value='CLOSED'>Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : formMode === "create"
                    ? "Create"
                    : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Batch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{batchToDelete?.name}</strong>?
              {batchToDelete?._count?.contributions ? (
                <span className='block mt-2 text-destructive'>
                  Warning: This batch has {batchToDelete._count.contributions}{" "}
                  contribution(s). Deleting will remove all associated data.
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Details Dialog */}
      <Dialog
        open={!!selectedBatch && !isDialogOpen}
        onOpenChange={() => setSelectedBatch(null)}
      >
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>{selectedBatch?.name}</DialogTitle>
          </DialogHeader>
          {selectedBatch && (
            <div className='space-y-6'>
              <div>
                <h3 className='text-sm font-medium text-muted-foreground mb-2'>
                  Description
                </h3>
                <p>{selectedBatch.description || "No description provided"}</p>
              </div>

              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div>
                  <p className='text-sm text-muted-foreground'>Principal</p>
                  <p className='text-lg font-semibold'>
                    {formatCurrency(selectedBatch.principal)}
                  </p>
                </div>
                <div>
                  <p className='text-sm text-muted-foreground'>Profit</p>
                  <p className='text-lg font-semibold text-green-600'>
                    {formatCurrency(selectedBatch.profit)}
                  </p>
                </div>
                <div>
                  <p className='text-sm text-muted-foreground'>Status</p>
                  <Badge
                    variant={
                      selectedBatch.status === "OPEN" ? "default" : "secondary"
                    }
                  >
                    {selectedBatch.status}
                  </Badge>
                </div>
                <div>
                  <p className='text-sm text-muted-foreground'>Contributions</p>
                  <p className='text-lg font-semibold'>
                    {(selectedBatch as BatchWithCounts)._count?.contributions ||
                      0}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-sm text-muted-foreground'>Start Date</p>
                  <p className='font-medium'>
                    {formatDate(selectedBatch.startDate)}
                  </p>
                </div>
                <div>
                  <p className='text-sm text-muted-foreground'>End Date</p>
                  <p className='font-medium'>
                    {selectedBatch.endDate
                      ? formatDate(selectedBatch.endDate)
                      : "Not set"}
                  </p>
                </div>
              </div>

              {/* Show contributions if available */}
              {"contributions" in selectedBatch &&
                Array.isArray((selectedBatch as any).contributions) &&
                (selectedBatch as any).contributions.length > 0 && (
                  <div>
                    <h3 className='text-sm font-medium text-muted-foreground mb-2'>
                      Recent Contributions
                    </h3>
                    <div className='border rounded-lg'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {((selectedBatch as any).contributions as any[])
                            .slice(0, 5)
                            .map((contribution: any) => (
                              <TableRow key={contribution.id}>
                                <TableCell>
                                  {contribution.user?.name ||
                                    contribution.user?.email}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(contribution.amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant='outline'>
                                    {contribution.source}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {formatDate(contribution.date)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
