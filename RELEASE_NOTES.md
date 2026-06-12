# Dollaz 0.2.0

- **OFX / QFX and QIF import**, alongside CSV. The format is detected
  automatically; OFX and QIF carry named fields so they skip the column-mapping
  step entirely.
- OFX transactions are deduplicated by the bank's own transaction id (FITID),
  making re-imports of overlapping ranges exact.
- QIF imports offer a date-format control for ambiguous dates.

Categorisation is unchanged and still applies to every format — new merchants
are surfaced once and the mapping is retained.

---

## 0.1.0

First release.

- Import bank CSVs with a column-mapping step that remembers each layout.
- Rule-based auto-categorisation; unmapped merchants surfaced for one-time mapping.
- Duplicate detection on re-import.
- Dashboard: income / expense / net, monthly trend, top categories.
- Analysis: category spend over time and simple projections (average / trend).
- Local-only; signed self-updates from GitHub Releases.
