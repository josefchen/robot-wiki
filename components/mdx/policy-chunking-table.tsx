'use client';

import type { ReactNode } from 'react';
import { Badge, Table, type Column } from '@/components/ui';

/**
 * The chunking/horizon table embedded in the action-chunking sample module.
 *
 * Every value comes from the comparison matrix in
 * research/01-learned-manipulation-lineage.md. Undisclosed or
 * embodiment-dependent values are null (rendered as "n/a", dim) rather than
 * guessed; unverified figures are excluded instead of flagged here.
 *
 * The null cells in this table deliberately mix two absences: values the
 * vendor has not published (Octo's and Helix 02's horizons) and values
 * that have no single answer (Octo's control rate varies by deployment;
 * GR00T N1.7's is embodiment-dependent). Forcing one word on the column
 * would make half the cells lie, so the caption states the mixture and the
 * cells render "n/a" through explicit renders below — NOT through the
 * shared Table fallback, which means "not disclosed" everywhere else.
 *
 * 'use client' because the Table columns carry render functions, which
 * cannot cross the RSC boundary from the compiled MDX page.
 */

/** Placeholder for the mixed-meaning nulls documented above. */
const NA: ReactNode = <span className="text-text-dim">n/a</span>;
type PolicyRow = {
  policy: string;
  year: number;
  /** Predicted action horizon H. */
  horizon: number | null;
  /** Control frequency in Hz (policy-side rate). */
  frequencyHz: number | null;
  representation: string;
  open: boolean;
};

const ROWS: PolicyRow[] = [
  {
    policy: 'RT-1',
    year: 2022,
    horizon: 1,
    frequencyHz: 3,
    representation: '256 discrete bins per dim',
    open: true,
  },
  {
    policy: 'ACT',
    year: 2023,
    horizon: 100,
    frequencyHz: 50,
    representation: 'CVAE decoder, continuous k x 14',
    open: true,
  },
  {
    policy: 'Diffusion Policy',
    year: 2023,
    horizon: 16,
    frequencyHz: 10,
    representation: 'DDPM over action chunks',
    open: true,
  },
  {
    policy: 'Octo',
    year: 2024,
    horizon: null,
    frequencyHz: null,
    representation: 'diffusion action head (chunked)',
    open: true,
  },
  {
    policy: 'pi0',
    year: 2024,
    horizon: 50,
    frequencyHz: 50,
    representation: 'flow matching, continuous',
    open: true,
  },
  {
    policy: 'pi0.5',
    year: 2025,
    horizon: 50,
    frequencyHz: 50,
    representation: 'flow matching + FAST supervision',
    open: true,
  },
  {
    policy: 'pi0.6',
    year: 2025,
    horizon: 50,
    frequencyHz: 50,
    representation: 'flow matching + FAST tokens',
    open: false,
  },
  {
    policy: 'pi0.7',
    year: 2026,
    horizon: 50,
    frequencyHz: 50,
    representation: 'flow matching, executes 15-25 of 50',
    open: false,
  },
  {
    policy: 'GR00T N1.7',
    year: 2026,
    horizon: 40,
    frequencyHz: null,
    representation: 'flow-matching DiT head, relative EEF',
    open: true,
  },
  {
    policy: 'Helix 02',
    year: 2026,
    horizon: null,
    frequencyHz: 200,
    representation: 'S1 (200 Hz) into S0 (1 kHz) commands',
    open: false,
  },
];

const COLUMNS: Column<PolicyRow>[] = [
  { key: 'policy', header: 'Policy', sortable: true },
  { key: 'year', header: 'Year', sortable: true, numeric: true },
  {
    key: 'horizon',
    header: 'Horizon H',
    sortable: true,
    numeric: true,
    // Explicit render: keeps the mixed-meaning "n/a" instead of the shared
    // fallback's "not disclosed" (see the file comment).
    render: (row) => row.horizon ?? NA,
  },
  {
    key: 'frequencyHz',
    header: 'Control Hz',
    sortable: true,
    numeric: true,
    render: (row) => row.frequencyHz ?? NA,
  },
  { key: 'representation', header: 'Action representation' },
  {
    key: 'open',
    header: 'Weights',
    render: (row) =>
      row.open ? <Badge variant="ok">open</Badge> : <Badge>closed</Badge>,
  },
];

export function PolicyChunkingTable() {
  return (
    <Table
      caption="Action horizon and control frequency across the policy lineage. n/a marks undisclosed or embodiment-dependent values."
      columns={COLUMNS}
      rows={ROWS}
      initialSort={{ key: 'year', direction: 'asc' }}
    />
  );
}
