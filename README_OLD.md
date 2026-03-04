# Investment Pool Tracker

Track group investments by share, profit distribution, and reinvestment flow.

## Two Approaches

### 1. Spreadsheet (Ready to Use) ⚡

Excel templates you can import to Google Sheets immediately. Best for quick start and small groups.

### 2. Web Application (Build Required) 🚀

Full Next.js web app with authentication, database, and role-based access. See [BUILD_PROMPT.md](BUILD_PROMPT.md) for complete specifications.

---

## Spreadsheet Approach

### Files

- `investment_pool_tracker.xlsx` - initial template
- `investment_pool_tracker_v2.xlsx` - improved template with dropdown validations + auto payout row generation

Use **v2** for production.

## Import to Google Sheets

1. Open Google Sheets
2. Go to **File -> Import -> Upload**
3. Upload `investment_pool_tracker_v2.xlsx`
4. Choose **Create new spreadsheet**

## Sheets and Purpose

- **Members**: member registry (`Member_ID` is key)
- **Batches**: investment rounds (`Batch_ID` is key), share price, term, maturity
- **Contributions**: each member investment per batch (cash or reinvest)
- **Returns**: batch-level actual returned amount at maturity
- **Payouts**: member-level principal/profit/payout/cashout
- **Dashboard**: summary metrics
- **Instructions**: quick in-file operating guide

## Key Behavior in v2

- Dropdowns:
  - `Batches.Status`: `Open` / `Closed`
  - `Contributions.Source`: `Cash` / `Reinvest`
  - Batch and Member IDs are selectable from master lists
- Auto calculations:
  - `Contributions.Amount = Shares * Share_Price`
  - `Returns.Total_Principal` and `Returns.Profit`
  - `Payouts` financial columns (principal/profit/gross/reinvested/cashout)
- Auto payout row generation:
  - `Payouts` auto builds unique `(Batch_ID, Member_ID)` pairs from `Contributions`

## Recommended Workflow (each cycle)

1. Add or update members
2. Create a new batch (start date, term months, share price)
3. Add contribution rows
4. At maturity, enter `Total_Return` in `Returns`
5. Review `Payouts` for each member result
6. For reinvestment, create a new `Contributions` row with:
   - `Source = Reinvest`
   - `Source_Batch_ID = old batch`

## Formula Compatibility Note

The workbook is optimized for Google Sheets after import. If some formulas show warnings on first import, re-open the file in Google Sheets and allow formula refresh.

---

## Web App Approach

For a production-grade solution with:

- User authentication (admin/member roles)
- PostgreSQL database
- Automatic calculations
- Mobile-friendly interface
- Member-specific dashboards
- Deployment to Vercel

See **[BUILD_PROMPT.md](BUILD_PROMPT.md)** for complete technical specifications, database schema, API design, and implementation guide.
