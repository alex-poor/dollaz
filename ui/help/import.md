# Import

Bring in a bank export — **CSV, OFX/QFX or QIF** — in three steps.

1. **Upload** — drop or choose a file. Dollaz detects the format automatically.
2. **Map columns** *(CSV)* / **Review** *(OFX/QIF)** —
   - **CSV:** tell Dollaz which columns are the date, description and amount. Use the **Debit / Credit** pair instead of a single Amount column if your bank splits them. Set the **date format** if dates are ambiguous, and **Flip sign** if spending shows as positive. Give the layout a name under *Remember as* and it will auto-map next time.
   - **OFX / QIF:** fields are read from the file, so there's nothing to map — just check the preview. QIF dates can be ambiguous, so a date-format control is offered if the preview looks off. (OFX also carries each transaction's unique id, which makes duplicate detection exact.)
3. **Categorise** — any merchant not matched by an existing rule is listed. Pick a category (or add one); this creates a **rule** that applies to these and all future imports. Skip anything you don't want to map yet. **This step happens for every format** — it's how payees become Groceries, Entertainment, and so on.

Re-importing a file that overlaps a previous one is safe — duplicate rows (same date, amount and description) are detected and skipped.
