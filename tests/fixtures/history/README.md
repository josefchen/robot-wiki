These are the historical inputs used by the regression tests. A clean checkout can run them without retaining the project's earlier Git object database.

The catalog pins each exact request, its commit and tree, the original output hash, and the hash of the archived bytes. Source reads also retain their original Git blob identifier. Identical outputs share one compressed text file. Historical inputs that already used the project's neutral vocabulary retain that rendering; byte comparisons require the original bytes to be unchanged. Missing catalog entries and altered archives fail closed.

The archive was collected from the actual historical objects while running the tests, then independently reread from Git by `scripts/record-historical-fixtures.ts`. It is not reconstructed from the successor edits being tested. The helper pins the catalog, and mutation tests exercise missing inputs, corruption and vocabulary drift in a directory with no Git history.

To verify and reproduce this archive in a checkout that still has the original objects:

```sh
node scripts/record-historical-fixtures.ts tests/fixtures/history/catalog.json
```

The historical checks retain their original claims and mutation cases. Current source, browser and release checks continue to inspect the current tree.
