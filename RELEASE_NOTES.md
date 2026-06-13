# Dollaz 0.3.2

- **Vaults are created automatically from OFX imports.** Each imported account
  becomes a vault (keyed to the bank's account id), and its **balance is synced
  from the statement** on every import — no manual entry. Already imported before
  this? **The Vaults screen offers "Derive N from the ledger."** Manual binding
  stays for accounts you don't import (e.g. KiwiSaver).
- Vault cards show the balance's "as of" date; per-vault monthly in/out now lines
  up with imported transactions (vault id = account id).
- **Sigils:** recasting or inscribing an incantation now reports how many
  inscriptions were **newly named** (and how many re-sigiled), not the total.

---

# Dollaz 0.3.1

- **Internal transfers no longer inflate income/expenses.** Money moved between
  your own vaults — transfers and credit-card payments — is detected (matching
  equal-and-opposite amounts across accounts within a few days), set apart, and
  excluded from income, expenses, net and category spend. Imports flag these
  automatically; The Ledger gains a **Reconcile transfers** action for data
  imported earlier, a **Transfers** filter, and a per-row "⇄ Transfer" option so
  you can mark or unmark anything by hand.

---

# Dollaz 0.3.0 — "The Illuminated Ledger"

A complete visual redesign and a new accounts feature.

- **New look:** a gilded gothic-grimoire theme — antique-gold gilt frames,
  Pre-Raphaelite jewel category colours, Playfair/Garamond/JetBrains Mono type,
  engraved hand-rolled charts, and an arcane copy voice. Dark only.
- **Vaults (accounts):** track everyday coffers, reserves, debt-bonds and
  retirement; balances roll up into a net-worth "Sum of Thy Hoard".
- **Augury (wellbeing):** a 0–100 standing score from your savings rate,
  emergency buffer and how much spend is still uncategorised.
- **Sanctum (dashboard), Auguries (analysis), The Ledger, Sigils, The Summoning**
  — every screen reworked; categorisation, projections and import are unchanged
  underneath.

---

## 0.2.0

- OFX / QFX and QIF import alongside CSV (format auto-detected; OFX dedupes by FITID).

## 0.1.0

- First release: CSV import, rule-based categorisation, dashboard, analysis, signed self-update.
