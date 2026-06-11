# Import

Bring in a bank CSV in three steps.

1. **Upload** — drop or choose any CSV export from your bank.
2. **Map columns** — tell Dollaz which columns are the date, description and amount. Use the **Debit / Credit** pair instead of a single Amount column if your bank splits them. Set the **date format** if dates are ambiguous, and **Flip sign** if spending shows as positive. Give the layout a name under *Remember as* and it will auto-map next time.
3. **Categorise** — any merchant not matched by an existing rule is listed. Pick a category (or add one); this creates a **rule** that applies to these and all future imports. Skip anything you don't want to map yet.

Re-importing a file that overlaps a previous one is safe — duplicate rows (same date, amount and description) are detected and skipped.
