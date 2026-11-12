import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActionTokenization } from '@/components/interactive/action-tokenization';
import { FlowMatchingTrajectory } from '@/components/interactive/flow-matching-trajectory';
import {
  ACTION_DIMS,
  BIN_COUNT,
  binIndex,
  generateActionChunk,
  tokenForBin,
} from '@/lib/action-tokenization';
import { endpointDispersion, generateFlowField, PI0_STEPS } from '@/lib/flow-matching';

const escapeMarkup = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

describe('manipulation merged figures', () => {
  it('shows the former decode beats in the tokenization lab at its default step', () => {
    // Beats: the step-7 value, its bin of 256, and seven tokens in decode order.
    const chunk = generateActionChunk();
    const value = chunk[0][7];
    const tokens = ACTION_DIMS.map((_, i) => tokenForBin(binIndex(chunk[i][7])));
    const markup = renderToStaticMarkup(createElement(ActionTokenization));
    expect(markup).toContain(`${ACTION_DIMS[0].label} = ${value.toFixed(3)}`);
    expect(markup).toContain(`bin ${binIndex(value)} of ${BIN_COUNT - 1}`);
    expect(markup).toContain(`token ${escapeMarkup(tokens[0])}`);
    // The main view writes each token as its word number, in decode order.
    const stream = markup.slice(
      markup.indexOf('data-testid="token-stream"'),
      markup.indexOf('</ol>', markup.indexOf('data-testid="token-stream"')),
    );
    let cursor = 0;
    for (const [i] of tokens.entries()) {
      const word = `word ${binIndex(chunk[i][7])}`;
      const at = stream.indexOf(word, cursor);
      expect(at, word).toBeGreaterThan(-1);
      cursor = at + 1;
    }
    expect(markup).toContain(`${ACTION_DIMS.length} sequential decodes per control step`);
  });

  it('reaches the former transport beats from the step presets', () => {
    // Beats: the ten-step transport and the one-step endpoint left short of the modes.
    const field = generateFlowField();
    const oneStep = endpointDispersion(field, 1);
    const tenSteps = endpointDispersion(field, PI0_STEPS);
    expect(oneStep).toBeGreaterThan(5 * tenSteps);
    const preset = renderToStaticMarkup(createElement(FlowMatchingTrajectory));
    expect(preset).toContain(`k = ${PI0_STEPS} Euler steps`);
    expect(preset).toContain(`>${tenSteps.toFixed(2)}<`);
    for (const label of ['1 step', `${PI0_STEPS} steps (π0)`]) expect(preset).toContain(`>${label}</button>`);
    const single = renderToStaticMarkup(createElement(FlowMatchingTrajectory, { defaultSteps: 1 }));
    expect(single).toContain('k = 1 Euler step');
    expect(single).toContain(`>${oneStep.toFixed(2)}<`);
  });
});
