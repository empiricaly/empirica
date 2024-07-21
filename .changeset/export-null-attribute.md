---
"@empirica/core": patch
---

Support export of `null` attributes.

Previously, `null` attributes would crash the export process. Now, they are
exported as `null` in the CSV file.
