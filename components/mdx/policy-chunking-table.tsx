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
const model = (id: string) => METHODS.find(method => method.id === id)!;
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
  open: boolean | null;
  weightsNote?: string;
};

const ROWS: PolicyRow[] = [
  {
    policy: 'RT-1',
    year: 2022,
    horizon: 1,
    frequencyHz: 3,
    frequencyNote: 'Everyday Robots commanded control',
    representation: '256 discrete bins per dim',
    open: model('rt-1').openWeights,
    weightsNote: model('rt-1').weightsNote,
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
    horizonNote: model('pi05').actionHorizon.note,
    frequencyHz: 50,
    frequencyNote: model('pi05').controlFrequencyNote,
    representation: 'paper: flow matching + FAST supervision; openpi: flow head only',
    open: true,
    weightsNote: model('pi05').weightsNote,
  },
  {
    policy: 'pi0.6',
    year: 2025,
    horizon: model('pi06').actionHorizon.planned,
    horizonNote: model('pi06').actionHorizon.note,
    frequencyHz: model('pi06').controlFrequencyHz,
    frequencyNote: model('pi06').controlFrequencyNote,
    representation: 'continuous-action flow matching; FAST backbone supervision during training',
    open: model('pi06').openWeights,
    weightsNote: model('pi06').weightsNote,
  },
  {
    policy: 'pi0.7',
    year: 2026,
    horizon: model('pi07').actionHorizon.planned,
    horizonNote: model('pi07').actionHorizon.note,
    frequencyHz: model('pi07').controlFrequencyHz,
    frequencyNote: model('pi07').controlFrequencyNote,
    representation: 'continuous-action flow matching; FAST backbone supervision during training',
    open: model('pi07').openWeights,
    weightsNote: model('pi07').weightsNote,
  },
  {
    policy: 'GR00T N1.7',
    year: 2026,
    horizon: 40,
    frequencyHz: null,
    frequencyNote: model('gr00t-n1-7').controlFrequencyNote,
    horizonNote: model('gr00t-n1-7').actionHorizon.note,
    representation: 'flow-matching DiT head, relative EEF',
    open: true,
    weightsNote: model('gr00t-n1-7').weightsNote,
  },
  {
    policy: 'Helix 02',
    year: 2026,
    horizon: null,
    horizonNote: model('helix-02').actionHorizon.note,
    frequencyHz: 200,
    representation: 'S1 joint targets (200 Hz), tracked by S0 actuator commands (1 kHz)',
    open: model('helix-02').openWeights,
    weightsNote: model('helix-02').weightsNote,
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
      <>{row.open === null ? NOT_DISCLOSED : row.open ? <Badge variant="ok">downloadable</Badge> : <Badge>not released</Badge>}{row.weightsNote ? <span className="block font-sans text-xs text-text-dim">{row.weightsNote}</span> : null}</>,
  },
];

export function PolicyChunkingTable() {
  return (
    <Table
      caption="Action horizon (predicted actions) and reported frequency (Hz). Setup-specific prediction, execution and controller rates are not interchangeable. Applicable unpublished values are not disclosed. Weights mean download availability, not license openness."
      columns={COLUMNS}
      rows={ROWS}
      initialSort={{ key: 'year', direction: 'asc' }}
    />
  );
}
