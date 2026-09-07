'use client';

import type { ReactNode } from 'react';
import { METHODS } from '@/data/methods';
import { Badge, Table, type Column } from '@/components/ui';

/** Reported examples, not universal deployment defaults. Source scope is visible
 * beside each value; null means applicable but not disclosed, never n/a.
 * Client boundary is required because Table columns contain render functions.
 */
const NOT_DISCLOSED: ReactNode = <span className="text-text-dim">not disclosed</span>;
const octo = METHODS.find((method) => method.id === 'octo')!;
const pi0 = METHODS.find((method) => method.id === 'pi0')!;
type PolicyRow = {
  policy: string;
  year: number;
  /** Predicted action horizon H. */
  horizon: number | null;
  /** Control frequency in Hz (policy-side rate). */
  frequencyHz: number | null;
  horizonNote?: string;
  frequencyNote?: string;
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
    horizon: octo.actionHorizon.planned,
    horizonNote: 'ALOHA finetuning: executes 12 of 64; not universal',
    frequencyHz: octo.controlFrequencyHz,
    frequencyNote: octo.controlFrequencyNote,
    representation: 'diffusion action head (chunked)',
    open: true,
  },
  {
    policy: 'pi0',
    year: 2024,
    horizon: pi0.actionHorizon.planned,
    horizonNote: 'Executes 16 on UR5e/Franka; 25 on other evaluated robots',
    frequencyHz: pi0.controlFrequencyHz,
    frequencyNote: pi0.controlFrequencyNote,
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
    render: (row) => <>{row.horizon ?? NOT_DISCLOSED}{row.horizonNote ? <span className="block font-sans text-xs text-text-dim">{row.horizonNote}</span> : null}</>,
  },
  {
    key: 'frequencyHz',
    header: 'Control Hz',
    sortable: true,
    numeric: true,
    render: (row) => <>{row.frequencyHz ?? NOT_DISCLOSED}{row.frequencyNote ? <span className="block font-sans text-xs text-text-dim">{row.frequencyNote}</span> : null}</>,
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
      caption="Action horizon (predicted actions) and reported frequency (Hz). Setup-specific prediction, execution and controller rates are not interchangeable. Applicable unpublished values are not disclosed."
      columns={COLUMNS}
      rows={ROWS}
      initialSort={{ key: 'year', direction: 'asc' }}
    />
  );
}
