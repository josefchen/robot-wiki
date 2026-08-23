#!/usr/bin/env node
/**
 * Plant-the-defect proof for the registry-generated-locator blindness
 * defect: deletes every authored-prose citation chip in a real browser
 * (against the static export) and asserts each spec's chip-count floor
 * now FAILS. A locator that still passes with the prose chips gone is
 * still masked. Thin wrapper over scripts/prose-anchor-probe.mjs --plant
 * (kept as its own entry point because the method has twice been lost as
 * uncommitted ephemera; this name is the one to reach for).
 *
 *   node scripts/plant-prose-anchor-deletion.mjs [--route <substring>] [--out <dir>]
 */
import { main } from "./prose-anchor-probe.mjs";

await main(["--plant", ...process.argv.slice(2)]);
