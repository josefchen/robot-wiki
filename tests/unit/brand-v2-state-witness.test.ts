import { describe, expect, it } from 'vitest';
import { implementedStateWitnesses, implementsState } from '@/lib/brand-v2-census';

describe('implemented UI state discovery successor', () => {
  it.each([
    ['error', '<p>Reconstruction error rises as noise increases.</p>'],
    ['error', 'const error = Math.abs(actual - expected); return <output>{error}</output>;'],
    ['error', 'const error = 0.2; return error ? <p>A measured residual</p> : null;'],
    ['error', 'function View({error}: {error: number}) { return <p>error: {error}</p>; }'],
    ['empty', '<g data-testid="surgical-autonomy-empty-3"><circle /></g>'],
    ['empty', 'const empty = cells.every(cell => !cell.occupied); return empty ? <g><path /></g> : <g><rect /></g>;'],
    ['empty', 'return sources.length > 0 ? <span>Source: {sources.map(render)}</span> : null;'],
    ['empty', 'return sources.length > 0 && <span>Source: {sources.map(render)}</span>;'],
    ['unavailable', '<p>Hollow nodes include unavailable and not-disclosed records.</p>'],
    ['loading', '// loading state\nconst label = "Loading";'],
  ] as const)('does not invent a %s state from scientific text or identifiers', (state, source) => {
    expect(implementsState(source, state)).toBe(false);
  });

  it.each([
    ['loading', 'return isLoading ? <p role="status">Loading data</p> : <Results />;'],
    ['loading', 'return <main aria-busy={loading}><Results /></main>;'],
    ['loading', 'if (loadState === "loading") return <progress />;'],
    ['error', 'return error && <p role="alert">Could not load</p>;'],
    ['error', 'const hasError = error !== null; return hasError ? <ErrorMessage /> : <Results />;'],
    ['error', 'if (status === "error") return <p>Could not load</p>;'],
    ['empty', 'return rows.length === 0 ? <p>No rows match</p> : <Table />;'],
    ['empty', 'return rows.length > 0 ? <Table /> : <p>No rows match</p>;'],
    ['empty', 'return !rows.length && <p>No rows match</p>;'],
    ['unavailable', 'return <p data-state="unavailable">Unavailable</p>;'],
    ['unavailable', 'return unsupported ? <p>WebGL unavailable</p> : <Canvas />;'],
    ['unavailable', 'return <span data-status={weights ? "open" : "unavailable"}>Weights</span>;'],
  ] as const)('retains an actual %s UI branch', (state, source) => {
    const witnesses = implementedStateWitnesses(source, state);
    expect(witnesses.length).toBeGreaterThan(0);
    expect(witnesses.every(({ line, expression }) => line > 0 && expression.length > 0)).toBe(true);
  });

  it('records the source line and rejects the same prose after the branch is removed', () => {
    const source = 'export function View({ loading }) {\nreturn loading && <p>Loading data</p>;\n}';
    expect(implementedStateWitnesses(source, 'loading')).toEqual([
      expect.objectContaining({ line: 2, kind: 'conditional-ui-branch' }),
    ]);
    expect(implementedStateWitnesses(source.replace('loading && ', ''), 'loading')).toEqual([]);
  });
});
