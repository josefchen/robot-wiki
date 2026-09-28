'use client';

import { SceneMount } from '@/components/motion/scene-mount';
import { StageSvg } from '@/components/motion/stage';
import { AnimatedCircle, AnimatedElement, AnimatedLine } from '@/components/motion/animated';
import { beatSpans, type SceneDefinition } from '@/components/motion/timeline';
import { clamp01, smooth } from '@/components/motion/easing';
import { ACTION_DIMS, BIN_COUNT, VALUE_MAX, VALUE_MIN, binIndex, generateActionChunk, tokenForBin } from '@/lib/action-tokenization';
import { LegendItem } from '@/components/ui/instrument';

const CHUNK = generateActionChunk();
const STEP = 7;
const DIMENSION = 0;
const VALUE = CHUNK[DIMENSION][STEP];
const BIN = binIndex(VALUE);
const VIEW = { left: 35, right: 305 };
const BIN_WIDTH = (VIEW.right - VIEW.left) / 15;

export const ACTION_DECODE_SCENE: SceneDefinition = {
  id: 'action-decode',
  title: 'From continuous action to token',
  beats: [
    { id: 'continuous', caption: 'A toy continuous action coordinate at step 7 has a value between −1 and 1.' },
    { id: 'quantize', caption: 'Uniform quantization assigns that value to one of 256 bins; the selected bin is indicated.' },
    { id: 'decode', duration: 'long', caption: 'The seven coordinates of one action vector become seven tokens, emitted one after another.' },
    { id: 'recap', caption: 'The token stream retains the bin choice, while seven sequential decodes add latency before one control step.' },
  ],
};

const SPANS = beatSpans(ACTION_DECODE_SCENE.beats);
const progress = (t: number, index: number) =>
  smooth(clamp01((t - SPANS[index].start) / SPANS[index].duration));

/** Pure frame function; the scene clock is the only time input. */
export function actionDecodeFrame(t: number) {
  return {
    value: VALUE,
    bin: BIN,
    token: tokenForBin(BIN),
    visibleTokens: ACTION_DIMS.filter((_, i) => progress(t, 2) * ACTION_DIMS.length >= i + 0.5)
      .map((dimension, i) => tokenForBin(binIndex(CHUNK[i][STEP]))),
    binsOpen: progress(t, 1),
    decodeProgress: progress(t, 2),
    recap: progress(t, 3),
  };
}

const valueX = VIEW.left + ((VALUE - VALUE_MIN) / (VALUE_MAX - VALUE_MIN)) * (VIEW.right - VIEW.left);

function ActionDecodeStage() {
  return (
    <StageSvg viewBox="0 0 340 240">
      <text x={35} y={34} fill="var(--motion-stage-label)" fontSize={14}>
        continuous action
      </text>
      <AnimatedElement
        as="text"
        x={239}
        y={34}
        fill="var(--role-action-stage)"
        fontSize={14}
        bindings={{ opacity: (t) => progress(t, 0) }}
      >
        {VALUE.toFixed(3)}
      </AnimatedElement>
      <line data-scene-structure="action-axis" x1={VIEW.left} x2={VIEW.right} y1={76} y2={76}
        stroke="var(--motion-stage-axes)" opacity="var(--motion-stage-axes-opacity)" />
      <text x={VIEW.left} y={96} fontSize={12} fill="var(--motion-stage-label-secondary)">{VALUE_MIN}</text>
      <text x={VIEW.right} y={96} textAnchor="end" fontSize={12} fill="var(--motion-stage-label-secondary)">{VALUE_MAX}</text>
      <AnimatedCircle
        data-scene-mark="continuous-action"
        cx={valueX} cy={76} r={4}
        fill="var(--role-action-stage)"
        bindings={{ opacity: (t) => progress(t, 0) }}
      />
      <AnimatedElement
        as="text" x={35} y={119}
        fontSize={13} fill="var(--motion-stage-label)"
        bindings={{ opacity: (t) => actionDecodeFrame(t).binsOpen }}
      >
        256 bins · zoom {BIN - 7}–{BIN + 7}
      </AnimatedElement>
      <AnimatedElement
        as="text" x={251} y={119}
        fontSize={14} fill="var(--role-highlight-stage)"
        bindings={{ opacity: (t) => actionDecodeFrame(t).binsOpen }}
      >
        bin {BIN}
      </AnimatedElement>
      {Array.from({ length: 15 }, (_, index) => (
        <AnimatedElement
          key={index}
          as="rect"
          data-scene-mark={`bin-${index}`}
          x={VIEW.left + index * BIN_WIDTH + 1} y={130}
          width={BIN_WIDTH - 2} height={10}
          fill={index === 7 ? 'var(--role-highlight-stage)' : 'var(--role-reference-stage)'}
          bindings={{ opacity: (t) => Number((actionDecodeFrame(t).binsOpen * (index === 7 ? 1 : 0.35)).toFixed(3)) }}
        />
      ))}
      <AnimatedElement as="text" x={35} y={161} fontSize={14}
        fill="var(--motion-stage-label)"
        bindings={{ opacity: (t) => actionDecodeFrame(t).decodeProgress }}>
        one token per coordinate
      </AnimatedElement>
      {ACTION_DIMS.map((dimension, index) => {
        const x = VIEW.left + index * 44;
        const token = tokenForBin(binIndex(CHUNK[index][STEP]));
        const tokenOpacity = (t: number) => Number(
          (actionDecodeFrame(t).visibleTokens.length > index ? 1 : 0).toFixed(3),
        );
        return (
          <g key={dimension.id}>
            <AnimatedCircle
              data-scene-mark={`decode-${index + 1}`}
              cx={x + 6} cy={183} r={5}
              fill="var(--role-action-stage)"
              bindings={{
                opacity: (t) => Number(clamp01(actionDecodeFrame(t).decodeProgress * ACTION_DIMS.length - index).toFixed(3)),
              }}
            />
            <AnimatedElement as="text" data-scene-token={index + 1}
              x={x + 6} y={index % 2 === 0 ? 207 : 226}
              textAnchor="middle" fontSize={14}
              fill="var(--role-action-stage)" bindings={{ opacity: tokenOpacity }}>
              {token}
            </AnimatedElement>
          </g>
        );
      })}
      <AnimatedLine data-scene-structure="decode-sequence" x1={VIEW.left} x2={VIEW.right - 2}
        y1={183} y2={183} stroke="var(--role-action-stage)" strokeWidth={1}
        bindings={{ opacity: (t) => Number((actionDecodeFrame(t).recap * 0.5).toFixed(3)) }} />
    </StageSvg>
  );
}

export function ActionDecode({ className }: { className?: string }) {
  return (
    <SceneMount
      scene={ACTION_DECODE_SCENE}
      stage={<ActionDecodeStage />}
      className={className}
      legend={
        <>
          <LegendItem series="decode-action" swatch={<span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--role-action-graphic)' }} />}>action coordinate</LegendItem>
          <LegendItem series="decode-selection" swatch={<span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--role-highlight-graphic)' }} />}>indicated bin</LegendItem>
        </>
      }
      readout={() => <><span className="text-text-dim">toy value</span> {VALUE.toFixed(3)} <span className="text-text-dim">→</span> bin {BIN} <span className="text-text-dim">→</span> {tokenForBin(BIN)}</>}
      statusLine="Schematic, illustrative action vector: normalized bounds and token labels are a toy, not a measured rollout or literal vocabulary. The 256-bin mechanism and sequential decoding are the subject; the lab below exposes all coordinates."
      textAlternative={`${ACTION_DECODE_SCENE.title}. ${ACTION_DECODE_SCENE.beats.map((beat, index) => `Beat ${index + 1}: ${beat.caption}`).join(' ')} The selected coordinate is ${ACTION_DIMS[DIMENSION].label} at step ${STEP}, assigned to bin ${BIN} of ${BIN_COUNT - 1}. The illustrative token sequence is ${ACTION_DIMS.map((dimension, index) => `${dimension.label} ${tokenForBin(binIndex(CHUNK[index][STEP]))}`).join(', ')}.`}
    />
  );
}

export default ActionDecode;
