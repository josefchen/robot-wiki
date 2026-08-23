<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Robot Wiki design-system contract

Before modifying any page, component, visualization, navigation surface,
social card, font, colour, or visual asset, read
`library/design-system.md` and `contract/design-integrity.md` completely.

- Treat `MUST`, `MUST NOT`, and the sealed validation criteria as release
  requirements.
- The approved identity is the plain `robot-wiki` wordmark plus the literal
  engineering grid. Do not invent a logo, monogram, mascot, favicon, or
  alternate visual direction.
- Preserve content, routes, citations, data truth, accessibility, and working
  interactions while converging visual implementation.
- If the specification and implementation disagree, fix the drift or ask the
  owner when the change would alter a locked foundation. Do not silently
  choose one.
- A shared visual change must update the specification, executable tokens,
  affected primitives, Open Graph artwork, and tests together.
- Inspect the rendered desktop and mobile routes named in the contract before
  reporting a design-system change complete.
