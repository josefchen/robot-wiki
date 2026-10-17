import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RUN_S, SceneSplit, liftAt, readoutFor } from '@/components/interactive/scene-split';
import {
  DRAWS_HOLDING_A_SCENE_OUT,
  EPISODES,
  HOLDOUT_TEST,
  RANDOM_DRAWS,
  RANDOM_TEST,
  TEST_SIZE,
  leakOf,
  liftShift,
  sceneOf,
  testSetOf,
} from '@/components/iso/figures/split-card-rack';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';

describe('SceneSplit model', () => {
  it('has twenty episodes, five per scene, and test sets of five in both splits', () => {
    expect(EPISODES).toBe(20);
    expect([0, 4, 5, 19].map(sceneOf)).toEqual([1, 1, 2, 4]);
    expect(RANDOM_TEST).toHaveLength(TEST_SIZE);
    expect(HOLDOUT_TEST).toEqual([15, 16, 17, 18, 19]);
  });

  it('leaks every test scene into training under the random split, none when scene 4 is held out', () => {
    const random = leakOf(RANDOM_TEST);
    expect(random.testScenes.length).toBeGreaterThan(1);
    expect(random.leaked).toEqual(random.testScenes);
    expect(leakOf(HOLDOUT_TEST)).toEqual({ testScenes: [4], leaked: [] });
  });

  it('counts the random draws that would keep a whole scene out of training', () => {
    expect(RANDOM_DRAWS).toBe(15504);
    expect(DRAWS_HOLDING_A_SCENE_OUT).toBe(4);
    // Brute force over every five-card draw agrees.
    let holding = 0;
    let draws = 0;
    for (let a = 0; a < 20; a++) for (let b = a + 1; b < 20; b++) for (let c = b + 1; c < 20; c++)
      for (let d = c + 1; d < 20; d++) for (let e = d + 1; e < 20; e++) {
        draws += 1;
        if (leakOf([a, b, c, d, e]).leaked.length < leakOf([a, b, c, d, e]).testScenes.length) holding += 1;
      }
    expect(draws).toBe(RANDOM_DRAWS);
    expect(holding).toBe(DRAWS_HOLDING_A_SCENE_OUT);
  });

  it('drops every card, then raises the test set one card after another, ending raised', () => {
    const test = testSetOf('holdout');
    expect(liftAt(3, 0, 'holdout', 1)).toBe(1);
    expect(liftAt(3, 0.4, 'holdout', 1)).toBe(0);
    expect(liftAt(test[0], RUN_S, 'holdout', 0)).toBe(1);
    expect(liftAt(test[4], RUN_S, 'holdout', 0)).toBe(1);
    expect(liftAt(test[4], 0.6, 'holdout', 0)).toBe(0);
  });
});

describe('SceneSplit', () => {
  it('opens on the random split: its test cards raised against the lit rail', () => {
    const { container } = render(<SceneSplit />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Test on scenes the model never trained on');
    expect(container.querySelector('[data-readout]')).toHaveTextContent(readoutFor('random'));
    expect(readoutFor('random')).toMatch(/also in training/);
    const raised = [...container.querySelectorAll('[data-episode][data-test]')].map((node) => Number(node.getAttribute('data-episode')));
    expect(raised).toEqual([...RANDOM_TEST]);
    for (const k of RANDOM_TEST) {
      const card = container.querySelector(`[data-episode="${k}"] > g:last-child`)!;
      expect(card.getAttribute('transform')).toBe(liftShift(1));
    }
    expect(container.querySelectorAll('.iso-solid[data-lit]')).toHaveLength(1);
    expect(container.querySelectorAll('svg text')).toHaveLength(0);
  });

  it('describes the drawing with the method paragraph that explains the rack', () => {
    render(<SceneSplit />);
    const id = screen.getByRole('img', { name: /Twenty episode cards/ }).getAttribute('aria-describedby');
    expect(document.getElementById(id ?? '')).toHaveTextContent(/^The rack is schematic: 20 episodes, 5 recorded in each of 4 scenes/);
  });

  it('holds out scene 4 from the preset row', () => {
    const { container } = render(<SceneSplit />);
    const holdout = screen.getByTestId('split-mode-holdout');
    fireEvent.click(holdout);
    expect(holdout).toHaveAttribute('aria-pressed', 'true');
    // The run button is a secondary action: it carries no pressed state, before or after a run starts.
    expect(screen.getByTestId('split-run')).toHaveTextContent('Run the split');
    expect(screen.getByTestId('split-run')).not.toHaveAttribute('aria-pressed');
    fireEvent.click(screen.getByTestId('split-run'));
    expect(screen.getByTestId('split-run')).not.toHaveAttribute('aria-pressed');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('Scene 4 held out · test cards from 1 scene · none of it in training');
    const raised = [...container.querySelectorAll('[data-episode][data-test]')].map((node) => Number(node.getAttribute('data-scene')));
    expect(raised).toEqual([4, 4, 4, 4, 4]);
    expect(screen.getByTestId('split-summary')).toHaveTextContent('also in training: none');
    expect(screen.getByRole('img', { name: /Holding out scene 4 raises all 5/ })).toBeInTheDocument();
  });

  it('resets from "Adjust more" to the random split it opens on, cards at rest', () => {
    const { container } = render(<SceneSplit />);
    fireEvent.click(screen.getByTestId('split-mode-holdout'));
    fireEvent.click(screen.getByTestId('split-run'));
    const fold = container.querySelector('details[data-figure-fold="adjust"]')!;
    expect(fold.querySelector('summary')).toHaveTextContent('Adjust more');
    const reset = [...fold.querySelectorAll('button')].filter((button) => button.textContent === 'Reset');
    expect(reset).toHaveLength(1);
    fireEvent.click(reset[0]);
    expect(screen.getByTestId('split-mode-random')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('split-mode-holdout')).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('[data-readout]')).toHaveTextContent(readoutFor('random'));
    expect(screen.getByTestId('split-knob')).toHaveAttribute('data-mode', 'random');
    for (let k = 0; k < EPISODES; k++) {
      const share = RANDOM_TEST.includes(k) ? 1 : 0;
      expect(container.querySelector(`[data-episode="${k}"] > g:last-child`)!.getAttribute('transform')).toBe(liftShift(share));
    }
  });
});

describe('SceneSplit served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<SceneSplit />)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/data-hardware/robot-learning-stack/');
    expect(figures).toEqual(['scene-split']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
