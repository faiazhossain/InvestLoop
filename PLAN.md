# Admin Batch Management Enhancement Plan

## Overview
Enhance the existing `/admin/batches` page with full CRUD operations, filtering, sorting, search, and detailed batch views.

---

## Phase 1: Update Types & Validation

### 1.1 Enhance Types (`src/types/index.ts`)
- Update `BatchFormData` to include all fields:
  - `name`: string (required, max 100 chars)
  - `description`: string (optional, textarea)
  - `targetAmount`: number (required, positive)
  - `startDate`: string (required, date)
  - `endDate`: string (optional, date, must be after start)
  - `managerId`: string (optional, dropdown of admins)
  - `status`: "OPEN" | "CLOSED" | "COMPLETED"
- Add `BatchWithDetails` type for batch with relations
- Add `BatchFilters` type for filtering

### 1.2 Update Zod Schema
```typescript
export const batchFormSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  targetAmount: z.number().positive("Target amount must be positive"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  managerId: z.string().optional(),
  status: z.enum(["OPEN", "CLOSED", "COMPLETED"]),
}).refine((data) => {
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, { message: "End date must be after start date" });
```

---

## Phase 2: Enhance API Routes

### 2.1 Update `/api/batches/route.ts`

**GET Enhancement:**
- Add query params: `status`, `managerId`, `search`, `sortBy`, `sortOrder`
- Return batches with contribution counts and totals

**POST Enhancement:**
- Validate all fields with Zod
- Check end date > start date
- Create batch with all fields

### 2.2 Update `/api/batches/[id]/route.ts`

**GET:** Return batch with full details:
- Batch data
- Contributions list with user info
- Total contributed vs target
- Associated returns
- Calculated payouts summary

**PATCH:**
- Validate updates
- Business rule: Cannot change dates if contributions exist
- Business rule: Cannot close batch with 0 contributions
- Business rule: Only admins can be managers

**DELETE:**
- Check for contributions before delete
- Return error if contributions exist
- Delete if no dependencies

---

## Phase 3: Create Reusable Components

### 3.1 BatchForm Component (`src/components/batches/BatchForm.tsx`)
Shared form for create/edit with:
- Name input (max 100 chars)
- Description textarea
- Target amount number input
- Start date picker
- End date picker (must be after start)
- Manager dropdown (fetch admin users)
- Status select
- Client-side validation with error display
- Submit/Cancel buttons

### 3.2 BatchDetailsModal (`src/components/batches/BatchDetailsModal.tsx`)
Modal showing:
- All batch information in card layout
- Progress bar (contributed vs target)
- Contributions table (user, amount, source, date)
- Returns section if applicable
- Payouts summary if applicable

### 3.3 DeleteConfirmDialog (`src/components/batches/DeleteConfirmDialog.tsx`)
- Warning message
- Batch name display
- Confirm/Cancel buttons
- Loading state during delete

### 3.4 StatusBadge Component (`src/components/batches/StatusBadge.tsx`)
Coded badge component:
- OPEN: green/success
- CLOSED: yellow/warning
- COMPLETED: blue/default

---

## Phase 4: Enhance Batch Page

### 4.1 State Management
```typescript
const [batches, setBatches] = useState<Batch[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [filters, setFilters] = useState<BatchFilters>({});
const [searchQuery, setSearchQuery] = useState("");
const [sortBy, setSortBy] = useState<string>("createdAt");
const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
const [isCreateOpen, setIsCreateOpen] = useState(false);
const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
const [viewingBatch, setViewingBatch] = useState<Batch | null>(null);
const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
```

### 4.2 Page Layout
```
+--------------------------------------------------+
| Batches                          [+ Add Batch]   |
| Manage investment batches                         |
+--------------------------------------------------+
| Filters:                                          |
| [Status v] [Manager v] [Search...    ] [Clear]   |
+--------------------------------------------------+
| Batch Table:                                      |
| Name | Target | Status | Dates | Manager | Contrib |
| Actions | Total | Actions                           |
+--------------------------------------------------+
| [Loading Spinner] or [Empty State]               |
+--------------------------------------------------+
```

### 4.3 Table Columns
1. Name (clickable to view details)
2. Target Amount
3. Status (badge)
4. Start Date - End Date
5. Manager
6. Contributions (count)
7. Total Contributed
8. Actions (Edit, Delete, View)

### 4.4 Features to Implement
- Filter dropdowns (status, manager)
- Search input (by batch name)
- Sort by clicking column headers
- Clear filters button
- Pagination (if needed for large datasets)

---

## Phase 5: Error Handling & UX

### 5.1 Toast Notifications
Add `sonner` or `react-hot-toast` for notifications:
- Success: "Batch created successfully"
- Error: "Failed to create batch: [reason]"
- Warning: "Cannot delete batch with contributions"

### 5.2 Form Validation
- Inline error messages below each field
- Disable submit during loading
- Show validation errors from API

### 5.3 Confirmation Dialogs
- Delete: "Are you sure you want to delete [batch name]?"
- Close batch: "This will close the batch. Continue?"

### 5.4 Loading States
- Table skeleton during initial load
- Spinner on buttons during operations
- Disabled state during submissions

---

## Phase 6: Prisma Schema Updates (if needed)

The current schema may need a `managerId` field:
```prisma
model Batch {
  // ... existing fields
  managerId  String?
  manager    User?    @relation("BatchManager", fields: [managerId], references: [id])
}

model User {
  // ... existing fields
  managedBatches Batch[] @relation("BatchManager")
}
```

---

## Files to Create/Modify

### New Files:
1. `src/components/batches/BatchForm.tsx`
2. `src/components/batches/BatchDetailsModal.tsx`
3. `src/components/batches/DeleteConfirmDialog.tsx`
4. `src/components/batches/StatusBadge.tsx`

### Modified Files:
1. `src/types/index.ts` - Add types and schemas
2. `src/app/(admin)/admin/batches/page.tsx` - Full rewrite
3. `src/app/api/batches/route.ts` - Enhance GET/POST
4. `src/app/api/batches/[id]/route.ts` - Add GET/PATCH/DELETE
5. `prisma/schema.prisma` - Add managerId if needed
6. `src/app/(admin)/layout.tsx` - Add toast provider

---

## Verification Checklist

1. **Create Batch**
   - [ ] Form validates all fields
   - [ ] End date must be after start date
   - [ ] Success toast shows
   - [ ] Table updates with new batch

2. **Edit Batch**
   - [ ] Form pre-populates correctly
   - [ ] Cannot change dates if contributions exist
   - [ ] Success toast shows

3. **Delete Batch**
   - [ ] Confirmation dialog shows
   - [ ] Error if contributions exist
   - [ ] Success if no dependencies

4. **Filtering & Sorting**
   - [ ] Status filter works
   - [ ] Manager filter works
   - [ ] Search by name works
   - [ ] Sort by columns works

5. **Batch Details**
   - [ ] Modal shows all info
   - [ ] Progress bar displays
   - [ ] Contributions list shows
   - [ ] Returns/payouts if applicable

6. **Error Handling**
   - [ ] API errors show toast
   - [ ] Form validation errors inline
   - [ ] Network errors handled

---

## Implementation Order

1. Update types and schemas
2. Create reusable components
3. Enhance API routes
4. Rewrite batch page
5. Add toast notifications
6. Test all features
