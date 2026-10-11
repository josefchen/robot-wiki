'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage, PresetGroup, type Preset } from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, CHART_TYPE, StageAnnotation, roleColour } from '@/components/motion/chart';
import { useEasedValue } from '@/components/motion/use-eased-value';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * DemoOrSim: why manipulation leaned on demonstrations while locomotion
 * trained in simulation. A policy trained by reinforcement learning in a
 * simulator learns against the simulator's contact model, and the 2026
 * reality-gap survey calls simplified contact models particularly
 * problematic in contact-rich tasks. A policy copied from real
 * demonstrations meets real contact and needs no contact model.
 *
 * The one control picks the recipe. The line that carries the contact
 * model's error to the real robot draws out or retracts on the motion
 * curve; reduced motion jumps. The pipeline is a schematic; the two
 * examples (ANYmal's four-minute walk, ACT's battery slotting) are the
 * papers'.
 */

type RecipeId = 'sim' | 'demo';
type Recipe = Preset<RecipeId> & {
  boxes: readonly (readonly string[])[];
  contact: string;
  example: readonly string[];
};
export const RECIPES: readonly Recipe[] = [
  {
    id: 'sim',
    label: 'Simulation, with RL',
    boxes: [['simulator'], ['learns by', 'trial and error'], ['policy runs on', 'the real robot']],
    contact: 'contact: approximate',
    example: ['ANYmal walked on flat ground', 'after under 4 minutes of training'],
  },
  {
    id: 'demo',
    label: 'Real demonstrations',
    boxes: [['person drives', 'the real robot'], ['copies the', 'recorded moves'], ['policy runs on', 'the real robot']],
    contact: 'contact: real, recorded',
    example: ['ACT slotted a battery 80 to 90% of the time', 'after 10 minutes of demonstrations'],
  },
];
export const DEFAULT_RECIPE: RecipeId = 'sim';
export const needsContactModel = (id: RecipeId) => id === 'sim';

const WIDTH = 340;
const HEIGHT = 176;
const BOX = 104;
const GAP = 12;
const LEFT = 2;
const BOX_TOP = 36;
const BOX_HEIGHT = 44;
const CONTACT_Y = BOX_TOP + BOX_HEIGHT + 18;
const CARRY_Y = CONTACT_Y + 14;
const boxX = (k: number) => LEFT + k * (BOX + GAP);
const CARRY_FROM = boxX(0) + BOX / 2;
const CARRY_TO = boxX(2) + BOX / 2;
const f = (v: number) => Number(v.toFixed(2));

const STATEMENT: Record<RecipeId, string> = {
  sim: "The simulator's contact errors carry over",
  demo: 'Real contact, so no contact model to get wrong',
};

function describe(id: RecipeId): string {
  return id === 'sim'
    ? 'Trained by reinforcement learning in a simulator, the policy learns against an approximate contact model whose errors reach the real robot, as when ANYmal learned to walk on flat ground in under 4 minutes of simulated training; copied from real demonstrations, it needs no contact model, as when ACT slotted a battery 80 to 90% of the time after 10 minutes of demonstrations.'
    : 'Copied from real demonstrations, the policy meets real contact and needs no contact model, as when ACT slotted a battery 80 to 90% of the time after 10 minutes of demonstrations; trained by reinforcement learning in a simulator, it learns against an approximate contact model, as when ANYmal learned to walk on flat ground in under 4 minutes.';
}

export function DemoOrSim({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const survey = citationFor('reality-gap-survey-2026');
  const rudin = citationFor('rudin-2021');
  const act = citationFor('act-aloha-2023');
  const [recipeId, setRecipeId] = useState<RecipeId>(DEFAULT_RECIPE);
  const recipe = RECIPES.find((r) => r.id === recipeId)!;
  const carry = useEasedValue(needsContactModel(recipeId) ? 1 : 0);
  const accent = roleColour('highlight');
  const carryEnd = f(CARRY_FROM + (CARRY_TO - CARRY_FROM) * carry);
  const sim = needsContactModel(recipeId);

  const link = (record: typeof survey, fallback: string) =>
    record ? (
      <a data-brand-control-id="control:link-focus" href={record.url} target="_blank" rel="noopener" className="underline-offset-2">
        {record.label}
      </a>
    ) : (
      fallback
    );

  return (
    <InstrumentFigure
      figureId="demo-or-sim"
      className={className}
      kicker="Two training recipes"
      heading="Real demonstrations need no contact model"
      controls={<PresetGroup label="Train the policy from" presets={RECIPES} value={recipeId} onChange={setRecipeId} testId="recipe" />}
      stage={
        <FigureStage footer={<StageStatus>Schematic; examples cited</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Three steps from training to the real robot. ${sim ? 'Trained in a simulator, the policy learns against an approximate contact model, and its errors reach the real robot.' : 'Copied from real demonstrations, the policy meets real contact and needs no contact model.'}`}
            aria-describedby={descriptionId}
            data-testid="recipe-stage"
            data-recipe={recipeId}
            data-contact-model={sim ? 'yes' : 'no'}
          >
            <StageAnnotation x={LEFT} y={16} lines={[STATEMENT[recipeId]]} />
            {recipe.boxes.map((lines, k) => (
              <g key={k} data-step={k + 1}>
                <rect x={boxX(k)} y={BOX_TOP} width={BOX} height={BOX_HEIGHT} fill={MOTION_STAGE.background} stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure} />
                <text
                  x={boxX(k) + BOX / 2}
                  y={BOX_TOP + BOX_HEIGHT / 2 + (lines.length === 1 ? 4 : -3)}
                  textAnchor="middle"
                  fontSize={CHART_TYPE.labelPx}
                  fill={CHART_STRUCTURE.label}
                >
                  {lines.map((line, i) => (
                    <tspan key={line} x={boxX(k) + BOX / 2} dy={i === 0 ? 0 : '1.15em'}>
                      {line}
                    </tspan>
                  ))}
                </text>
                {k < 2 ? (
                  <g stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure} fill={CHART_STRUCTURE.axes}>
                    <line x1={boxX(k) + BOX} y1={BOX_TOP + BOX_HEIGHT / 2} x2={boxX(k + 1) - 4} y2={BOX_TOP + BOX_HEIGHT / 2} />
                    <polygon points={`${boxX(k + 1)},${BOX_TOP + BOX_HEIGHT / 2} ${boxX(k + 1) - 5},${BOX_TOP + BOX_HEIGHT / 2 - 3} ${boxX(k + 1) - 5},${BOX_TOP + BOX_HEIGHT / 2 + 3}`} stroke="none" />
                  </g>
                ) : null}
              </g>
            ))}
            <text data-testid="recipe-contact" x={boxX(0) + 4} y={CONTACT_Y} fontSize={CHART_TYPE.labelPx} fill={sim ? accent : CHART_STRUCTURE.label}>
              {recipe.contact}
            </text>
            <g data-testid="recipe-carry" data-chart-role="highlight" data-carry={f(carry)}>
              {carryEnd - CARRY_FROM > 10 ? (
                <>
                  <line x1={CARRY_FROM} y1={CARRY_Y} x2={carryEnd - 5} y2={CARRY_Y} stroke={accent} strokeWidth={CHART_STROKE.trace} strokeDasharray={CHART_STROKE.dash} />
                  <polygon points={`${carryEnd},${CARRY_Y} ${carryEnd - 7},${CARRY_Y - 4} ${carryEnd - 7},${CARRY_Y + 4}`} fill={accent} />
                </>
              ) : null}
              {sim && carry > 0.5 ? (
                <text x={boxX(2) + BOX} y={CARRY_Y + 18} textAnchor="end" fontSize={CHART_TYPE.labelPx} fill={accent}>
                  its errors reach the robot
                </text>
              ) : null}
            </g>
            <text x={LEFT} y={HEIGHT - 22} fontSize={CHART_TYPE.labelPx} fill="var(--role-reference-text)">
              {recipe.example.map((line, i) => (
                <tspan key={line} x={LEFT} dy={i === 0 ? 0 : '1.25em'}>
                  {i === 0 ? `Example: ${line}` : line}
                </tspan>
              ))}
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption="A policy trained in simulation inherits its contact model's errors; one copied from real demonstrations needs none."
      method={
        <>
          <div>
            Locomotion papers read PPO, domain randomization and curriculum: the policy learns by trial and error in a
            simulator, against the simulator&apos;s model of contact. The 2026 reality-gap survey calls mismatches from
            simplified contact models particularly problematic in contact-rich tasks. Many manipulation papers learn
            instead from real demonstrations, which need no contact model.
          </div>
          <div>
            The pipeline is a schematic. The examples are the article&apos;s: Rudin and colleagues&apos; ANYmal walked on
            flat ground after under four minutes of simulated training, and ACT slotted a battery at 80 to 90% success
            from 10 minutes of demonstrations.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="What each recipe needs from a contact model"
            description={describe(recipeId)}
            rowHeader="train the policy from"
            columns={[{ header: 'needs a contact model' }, { header: 'example' }]}
            rows={RECIPES.map((r) => ({ label: r.label, values: [needsContactModel(r.id) ? 'yes' : 'no', r.example.join(' ')] }))}
          />
        </>
      }
      source={
        <span data-testid="recipe-source">
          {link(survey, 'the reality-gap survey')}; {link(rudin, 'Rudin and colleagues')};{' '}
          {link(act, 'ACT')}.
        </span>
      }
    />
  );
}
