# InvestLoop - How It Works (Simple Explanation)

## 📊 The 6 Main Tables & Their Connections

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           InvestLoop System                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   👤 USERS                                                                  │
│      │                                                                      │
│      │ puts money in                                                        │
│      ▼                                                                      │
│   💰 CONTRIBUTIONS ──────────► 📦 BATCHES (Investment Pool)                │
│                                    │                                        │
│                                    │ when investment ends                   │
│                                    ▼                                        │
│                               📈 RETURN (profit recorded)                  │
│                                    │                                        │
│                                    │ automatically calculates              │
│                                    ▼                                        │
│                               💵 PAYOUTS (each member's share)             │
│                                    │                                        │
│                             ┌──────┴──────┐                                 │
│                             │             │                                 │
│                             ▼             ▼                                 │
│                      🏦 CASHOUT    🔄 REINVESTMENT                         │
│                      (withdraw)   (put into next batch)                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 The Investment Cycle (Step by Step)

### Step 1: Create a Batch (Investment Pool)

- Admin creates a "Batch" - this is like a pot where money will be collected
- Example: "March 2026 Investment Round"
- Status: **OPEN** (accepting money)

### Step 2: Members Contribute

- Members put money into the batch
- Contribution can be:
  - **CASH** = Fresh new money from the member
  - **REINVEST** = Money from a previous batch's profit

### Step 3: Investment Runs

- The batch is used for investment (outside the system)
- Money grows (hopefully!)

### Step 4: Record the Return

- Admin records the result when investment ends
- Records: **Total Return** and **Profit**
- Batch automatically changes to **CLOSED** status

### Step 5: Automatic Payout Calculation ⭐

This is the key calculation:

```
For each member:
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  Member's Share = (Member's Contribution ÷ Total Pool)     │
│                                                            │
│  Member's Profit = Member's Share × Total Batch Profit     │
│                                                            │
│  Gross Payout = Member's Contribution + Member's Profit    │
│                                                            │
│  Cashout = Gross Payout - Amount Reinvested                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Example:**

| Item                  | Amount                |
| --------------------- | --------------------- |
| Batch Total Pool      | 100,000               |
| Batch Profit          | 10,000                |
| Member A Contribution | 25,000 (25%)          |
| Member A's Profit     | 2,500 (25% of 10,000) |
| Gross Payout          | 27,500                |
| If Reinvested         | 10,000                |
| **Cash Received**     | **17,500**            |

### Step 6: Reinvestment (Optional)

- Members can choose to put some/all of their payout into a new batch
- This creates:
  - A **Reinvestment** record (tracking the flow)
  - A new **Contribution** (marked as REINVEST source)
  - The cycle continues...

---

## 📋 Table Relationships Summary

| Table            | Connects To                           | Purpose                                |
| ---------------- | ------------------------------------- | -------------------------------------- |
| **User**         | Contributions, Payouts, Reinvestments | Tracks members                         |
| **Batch**        | Everything                            | The investment pool                    |
| **Contribution** | User, Batch, Reinvestment             | Money put into batch                   |
| **Return**       | Batch (1-to-1)                        | Records profit when investment ends    |
| **Payout**       | User, Batch                           | Each member's calculated share         |
| **Reinvestment** | Source Batch → Target Batch           | Money flow from old batch to new batch |

---

## 🗃️ Database Schema Details

### User Table

```
- id: Unique ID
- clerkId: Authentication ID (Clerk)
- email: User's email
- name: User's name
- role: ADMIN or MEMBER
- isActive: Is the user active?
```

### Batch Table

```
- id: Unique ID
- name: Batch name (e.g., "March 2026 Round")
- description: Optional description
- principal: Total money collected
- profit: Total profit earned
- status: OPEN or CLOSED
- startDate: When batch started
- endDate: When batch ended
```

### Contribution Table

```
- id: Unique ID
- userId: Who contributed
- batchId: Which batch
- amount: How much
- source: CASH or REINVEST
- date: When contributed
- notes: Optional notes
```

### Return Table

```
- id: Unique ID
- batchId: Which batch (one-to-one)
- totalReturn: Total amount returned
- profit: Profit earned
- date: When recorded
- notes: Optional notes
```

### Payout Table

```
- id: Unique ID
- userId: Who gets the payout
- batchId: From which batch
- principal: Original contribution
- profit: Profit earned
- grossPayout: principal + profit
- reinvested: Amount put into new batch
- cashout: Amount withdrawn (grossPayout - reinvested)
```

### Reinvestment Table

```
- id: Unique ID
- userId: Who is reinvesting
- sourceBatchId: Money coming FROM this batch
- targetBatchId: Money going TO this batch
- sourcePayoutId: Which payout this came from
- targetContributionId: Which contribution this created
- amount: How much reinvested
```

---

## 📊 Member Stats Explained

| Stat                 | What it means                                   |
| -------------------- | ----------------------------------------------- |
| **Total Invested**   | Only counts CASH contributions (real new money) |
| **Active Principal** | Money currently in OPEN batches                 |
| **Total Profit**     | Sum of all profits from closed batches          |
| **Total Cashout**    | Money actually withdrawn                        |
| **Total Reinvested** | Money put back into new investments             |

---

## 🔑 Key Points

1. **One Batch = One Return** - Each batch has exactly one return record
2. **Payouts are automatic** - Calculated when return is recorded
3. **Reinvestment tracking** - System tracks where money comes from and goes to
4. **Two contribution types** - CASH (new money) vs REINVEST (recycled profit)
5. **Profit sharing is proportional** - Your share of profit = your share of the pool

---

## 🔐 Access Control

| Role       | Can Do                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------- |
| **ADMIN**  | Create batches, add contributions, record returns, manage reinvestments, view everything |
| **MEMBER** | View their own contributions, payouts, and batches they participated in                  |
