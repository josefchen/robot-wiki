# Reusable test-infrastructure harnesses

## Controlled CPU load

Use the load harness instead of starting ad-hoc infinite loops:

```sh
npm run test:under-load -- --workers 6 --duration 45 -- \
  npx playwright test tests/e2e/legged-locomotion.spec.ts
```

The harness accepts 1–12 workers and a 1–300 second duration. Each worker has
its own deadline, and the shell trap stops and waits for every worker when the
wrapped command exits or the harness receives `EXIT`, `INT`, `TERM`, or `HUP`.
The wrapped command runs in its own process group. On a termination signal,
the harness stops that whole group, allows one second for shutdown, then
force-stops any process that ignored the signal. The command's exit status is
preserved. `--pid-file` is available for
diagnostics and automated cleanup tests; routine use does not need it.

Keep the worker count below the machine's logical-core count. This is a
repeatable timing stress, not a benchmark, and a failure under load still
needs a low-load control run before it is classified.

## Assertion-equivalence proof

Capture reporter-visible Playwright names before and after an infrastructure
refactor:

```sh
npx playwright test tests/e2e/example.spec.ts --list > /tmp/example-before.txt
# make the refactor
npx playwright test tests/e2e/example.spec.ts --list > /tmp/example-after.txt
npm run compare:test-inventories -- \
  /tmp/example-before.txt /tmp/example-after.txt
```

The comparison ignores source line and column movement, then compares the
normalized reporter-visible names and their multiplicities. It prints total
count drift plus deterministic added and removed lists, and exits 1 on any
difference.

The same command accepts JSON inventories under an `assertions`, `tests`,
`inventory`, or `items` key. String entries are whitespace-normalized.
Objects use `id: title` when both fields exist, otherwise `name`, `title`, or
`id`. This supports contract inventories that are not Playwright suites
without weakening the reporter-name check.
