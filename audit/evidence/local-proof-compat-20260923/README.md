# Retained verification inputs

These four inert text files preserve the exact checker and test bytes used by
the existing reward, sim2real and parallel receipts. They are copied from
release candidate `b57b8eb`, not newly executed evidence. The production
catalog, proof/review digests, receipts, commands, working directories,
timestamps, source bodies and observations are unchanged.

The portability repair treats a receipt's absolute `cwd` as historical
provenance. Validation reads only the supplied checkout. It never reads or
executes at the historical directory.

`lib/audit-local-basis.ts` permits only these four exact path/size/SHA-256
tuples. The retained checker and current checker must have byte-identical
20,806-byte prefixes, through the complete imports, schemas, target/dependency
maps and derivation implementation. The context checkout's checker must also
equal the running checker. Later computation changes require affected new
proof, not another arbitrary historical fallback.

The three current unit-test hashes are pinned to the reviewed assertion-only
repair: load the complete published route registry and select reward plans by
identity rather than global count/index. Numeric oracles, producer bodies,
capture opt-ins, output formats and model dependencies are unchanged. Old
receipts continue to identify the old tests; current regression runs are
separate verification, not replacement receipts.

Generic artifact reads remain strict. Models, components, disclosures,
source passages, inputs/outputs, mount fingerprints, capture bytes, complete
part inventories and semantic reviews retain their existing checks. Unknown
versions, missing/corrupt snapshots and unreviewed live test changes fail.

Regression coverage includes unavailable historical directories, unchanged
catalog serialization, snapshot corruption and symlinks, unknown hashes,
changed computation, context/running checker mismatch, live model changes,
and invalid or receipt-mismatched provenance.
