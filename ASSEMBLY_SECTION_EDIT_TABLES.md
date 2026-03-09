# Assembly Section Edit - Table Source Mapping

This note explains how table creation works in `src/pages/AssemblySectionEdit.tsx`.

## 1) Two separate sources are required

### A. Array Source Dropdown
- Comes from: `src/lib/documentSourcePaths.ts`
- Group used by table builder:
  - `"Arrays (map in tables)"`
- Example option:
  - `Key Competitors -> key_competitors`

### B. Placeholder Field Picker
- Comes from: `ARRAY_SOURCE_FIELD_MAP` in `AssemblySectionEdit.tsx`
- Key must match selected `array_source` exactly.
- Example:
  - If `array_source = "key_competitors"`, then `ARRAY_SOURCE_FIELD_MAP["key_competitors"]` must exist.

If A exists but B is missing, the user can select an array source but **no fields appear** in “Pick placeholder field”.

---

## 2) Runtime flow in the UI

1. User picks `array_source`.
2. Component calls:
   - `fieldOptionsForSource(step.params_json.array_source ?? "")`
3. This reads:
   - `ARRAY_SOURCE_FIELD_MAP[array_source] ?? []`
4. Returned options drive:
   - placeholder field dropdown
   - source path assignment (`$row.<field>`) for columns

---

## 3) Backend assembly dependency

In `tpgps-backend/app/api/routes/draft_documents.py`, `table_section` action uses:
- `params_json.array_source`
- `params_json.columns[*].source_path`
- optional `value_template`, `totals`, `merge_cells`

It reads rows from document using `array_source`, then maps each row field by `source_path`.

So frontend must produce valid table config payload:
- `array_source` must be a real document array
- column `source_path` must match row keys for that array

---

## 4) `key_competitors` fix

Problem:
- `key_competitors` was added to `documentSourcePaths.ts` array options,
- but missing in `ARRAY_SOURCE_FIELD_MAP`.

Effect:
- array source selectable,
- placeholder field picker empty.

Fix:
- Added `key_competitors` entry to `ARRAY_SOURCE_FIELD_MAP` with:
  - `competitor`
  - `coRegNo`
  - `financialYearEnded`
  - `principalActivity`
  - `country`
  - `acceptedRejected`
  - `reasons`

---

## 5) Rule for adding any new array source

Whenever a new array source is introduced:
1. Add it to `documentSourcePaths.ts` under `"Arrays (map in tables)"`.
2. Add the matching key and fields in `ARRAY_SOURCE_FIELD_MAP`.
3. Ensure field names match actual object keys saved by `CreateTPDoc.tsx`.

Without both steps, table builder UX will be incomplete.
