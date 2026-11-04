import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImpedancePress, RUN_SECONDS, displayReadoutFor, displayHintFor, targetGapGuide, targetValue, valueTextFor } from '@/components/interactive/impedance-press';
import { MARK, PAN_TOP, SPRING_HANG, needleAngle, poseFor, tipFor } from '@/components/iso/figures/spring-press';
import { PUSH_MAX, TARGET_MAX, TARGET_MIN, pushFor } from '@/lib/impedance-press';

afterEach(() => {
  vi.unstubAllGlobals();
});

const still = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));


/** Independent geometry expectations for the added illustrative scale, not calls into its drawing helper. */
const expectPushDial = (push: number) => {
  const dial = screen.getByTestId('press-push-dial');
  expect(dial).toBeVisible();
  expect(dial).toHaveRole('img');
  expect(dial).toHaveAccessibleName('Push dial');
  expect(dial).toHaveAccessibleDescription(`push: ${push} dial marks Schematic push scale from 0 to 12 dial marks, without physical units.`);
  expect(dial).toHaveAttribute('viewBox', '0 0 112 112');
  expect(dial).toHaveAttribute('data-push', String(push));
  expect(dial).toHaveAttribute('data-min', '0');
  expect(dial).toHaveAttribute('data-max', '12');
  expect(dial).toHaveClass('motion-stage-svg', 'h-28', 'w-28', 'shrink-0', 'overflow-visible', 'forced-colors:text-[CanvasText]!');
  expect([...dial.querySelectorAll('[data-dial-mark]')].map(n => Number(n.getAttribute('data-dial-mark')))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  expect([...dial.querySelectorAll('[data-dial-label]')].map(n => n.textContent)).toEqual(['0', '4', '8', '12']);
  for (const group of dial.querySelectorAll('[data-dial-mark]')) {
    const mark = Number(group.getAttribute('data-dial-mark'));
    const angle = (-135 + 270 * mark / 12) * Math.PI / 180;
    const major = mark % 4 === 0;
    const tick = group.querySelector('line')!;
    expect(Number(tick.getAttribute('x1'))).toBeCloseTo(56 + Math.sin(angle) * (major ? 27 : 30), 9);
    expect(Number(tick.getAttribute('y1'))).toBeCloseTo(50 - Math.cos(angle) * (major ? 27 : 30), 9);
    expect(Number(tick.getAttribute('x2'))).toBeCloseTo(56 + Math.sin(angle) * 34, 9);
    expect(Number(tick.getAttribute('y2'))).toBeCloseTo(50 - Math.cos(angle) * 34, 9);
    expect(tick).toHaveAttribute('stroke', 'currentColor');
    expect(group.querySelectorAll('text')).toHaveLength(major ? 1 : 0);
    if (major) {
      const label = group.querySelector('text')!;
      expect(Number(label.getAttribute('x'))).toBeCloseTo(56 + Math.sin(angle) * 46, 9);
      expect(Number(label.getAttribute('y'))).toBeCloseTo(50 - Math.cos(angle) * 46, 9);
      expect(label).toHaveAttribute('fill', 'currentColor');
      expect(label).toHaveAttribute('data-scene-readout');
      expect(label).toHaveClass('font-mono', 'text-[14px]');
    }
  }
  const needle = screen.getByTestId('press-dial-needle');
  const angle = (-135 + 270 * push / 12) * Math.PI / 180;
  expect(needle).toHaveAttribute('x1', '56');
  expect(needle).toHaveAttribute('y1', '50');
  expect(Number(needle.getAttribute('x2'))).toBeCloseTo(56 + Math.sin(angle) * 25, 9);
  expect(Number(needle.getAttribute('y2'))).toBeCloseTo(50 - Math.cos(angle) * 25, 9);
  expect(needle).toHaveAttribute('stroke', 'currentColor');
  expect(needle).toHaveAttribute('stroke-width', '2');
  expect(dial.querySelectorAll('circle')).toHaveLength(2);
  expect(dial.querySelector('circle')).toHaveAttribute('r', '34');
  expect(dial.querySelector('circle')).toHaveAttribute('fill', 'none');
  expect(dial.querySelector('circle')).toHaveAttribute('stroke', 'currentColor');
};

describe('the spring press drawing', () => {
  it('projects the marked target gap on the actual tool line, with coincident endpoints before contact', () => {
    // Pinned independently from the frozen camera, pan height and ruler spacing;
    // these expected positions do not call the UI projection helper or iso().
    const rows = [
      [-2, 354.02916999548216, 354.02916999548216, 0],
      [-1.5, 362.64882447594096, 362.64882447594096, 0],
      [-0.5, 379.88813343685865, 379.88813343685865, 0],
      [0, 388.50778791731744, 388.50778791731744, 0],
      [0.5, 388.50778791731744, 397.1274423977763, 0.5],
      [1, 388.50778791731744, 405.7470968782351, 1],
      [2, 388.50778791731744, 422.9864058391528, 2],
      [3, 388.50778791731744, 440.2257148000704, 3],
    ] as const;
    for (const [target, toolY, targetY, gap] of rows) {
      const guide = targetGapGuide(target);
      expect(guide.tool[0]).toBeCloseTo(362.8953269648107, 9);
      expect(guide.target[0]).toBeCloseTo(362.8953269648107, 9);
      expect(guide.tool[1]).toBeCloseTo(toolY, 9);
      expect(guide.target[1]).toBeCloseTo(targetY, 9);
      expect(guide.gap).toBe(gap);
      expect(guide.target[1] - guide.tool[1]).toBeCloseTo(17.23930896091765 * gap, 9);
    }
  });

  it('hangs the tool on the target in free space and squeezes the spring by the gap past the surface', () => {
    for (let target = TARGET_MIN; target <= TARGET_MAX; target += 0.5) {
      const pose = poseFor(target);
      if (target <= 0) {
        expect(pose.tip).toBeCloseTo(tipFor(target), 9);
        expect(pose.nutLift).toBeCloseTo(0, 9);
        expect(pose.springLength).toBeCloseTo(SPRING_HANG, 9);
      } else {
        expect(pose.tip).toBeCloseTo(PAN_TOP, 9);
        expect(pose.nutLift).toBeCloseTo(target * MARK, 9);
        expect(pose.springLength).toBeCloseTo(SPRING_HANG - target * MARK, 9);
      }
      expect(pose.springLength).toBeGreaterThan(8);
    }
  });

  it('turns the needle with the push, from the dial zero to its last mark', () => {
    expect(needleAngle(0)).toBeCloseTo((-135 * Math.PI) / 180, 9);
    expect(needleAngle(PUSH_MAX)).toBeCloseTo((135 * Math.PI) / 180, 9);
    let last = -Infinity;
    for (let push = 0; push <= PUSH_MAX; push += 0.5) {
      expect(needleAngle(push)).toBeGreaterThan(last);
      last = needleAngle(push);
    }
  });
});

describe('ImpedancePress', () => {
  it('draws the still pose: the medium spring two marks past the surface, no words in the drawing', () => {
    render(<ImpedancePress />);
    expect(screen.getByText('This action sends target and stiffness for contact')).toBeInTheDocument();
    expect(screen.getByText('This action sends target and stiffness for contact')).toHaveAttribute('data-figure-title');
    const relationship = screen.getByTestId('press-relationship');
    expect(relationship.textContent?.replace(/\s+/g, ' ').trim()).toBe('An action sends two settings: target +2 and stiffness 2; Controller: uses these settings to make the tool act like a spring. Shown response The surface stops the tool. Surface Shown target: 2 marks past surfaceSchematic push scale from 0 to 12 dial marks, without physical units.04812 ↓ push equals stiffness times target gap. sent stiffness: 2 × times target gap: 2 ruler marks = equals push: 4 dial marks 2 × 2 = 4 Ruler: target gap. Dial: push.');
    expect(relationship).toBeVisible();
    expect(relationship.closest('details')).toBeNull();
    expect(relationship.closest('[hidden], [aria-hidden="true"]')).toBeNull();
    expect(relationship.parentElement).toBe(screen.getByTestId('press-action-packet'));
    expect(relationship.parentElement?.firstElementChild).toBe(relationship);
    const packet = screen.getByTestId('press-action-packet');
    const nativeControls = screen.getByTestId('press-native-controls');
    const causalStage = screen.getByTestId('press-stage-frame');
    const causalFrame = causalStage.closest('figure[data-figure-frame="impedance-press"]')!;
    expect(causalFrame.querySelectorAll('[data-figure-stage]')).toHaveLength(1);
    expect(causalFrame.querySelector(':scope > [data-figure-stage]')).toBe(causalStage);
    expect(causalStage).toHaveAttribute('data-anatomy-stage');
    expect(packet.parentElement).toHaveAttribute('data-anatomy-drawing');
    expect(packet.parentElement?.firstElementChild).toBe(packet);
    expect(packet.parentElement?.parentElement).toBe(causalStage);
    expect(causalStage).toContainElement(packet);
    expect(causalFrame.querySelector('[data-figure-header]')).not.toContainElement(packet);
    expect(causalFrame.querySelectorAll('[data-figure-controls]')).toHaveLength(1);
    expect(causalFrame.querySelector('[data-figure-controls]')).toBe(nativeControls);
    expect(nativeControls).toHaveAttribute('data-figure-controls');
    expect(nativeControls).toHaveClass('grid', 'min-w-0', 'gap-1');
    expect(nativeControls.closest('[data-figure-stage]')).toBe(causalStage);
    expect(nativeControls).toBeVisible();
    expect(nativeControls.querySelectorAll('button, input')).toHaveLength(5);
    expect(nativeControls).toContainElement(screen.getByTestId('press-settings'));
    expect(nativeControls).toContainElement(screen.getByTestId('press-run'));
    expect(packet).toContainElement(screen.getByTestId('press-settings'));
    expect(packet.firstElementChild).toBe(relationship);
    const primary = screen.getByTestId('press-primary-takeaway');
    const actionClause = screen.getByTestId('press-action-clause');
    const responseDiagram = screen.getByTestId('press-response-diagram');
    const proof = screen.getByTestId('press-proof');
    const analogyGroup = screen.getByTestId('press-analogy');
    const controllerOutput = screen.getByTestId('press-controller-output');
    const controllerHeading = screen.getByTestId('press-controller-heading');
    const sendConnector = screen.getByTestId('press-send-connector');
    const calculation = screen.getByTestId('press-calculation');
    const equation = screen.getByTestId('press-equation');
    const descriptions = screen.getByTestId('press-value-descriptions');
    const generalRule = screen.getByTestId('press-general-rule');
    const contactClause = screen.getByTestId('press-contact-clause');
    const sendPath = screen.getByTestId('press-send-path');
    const contactCondition = screen.getByTestId('press-position-condition');
    const actionMessage = screen.getByTestId('press-action-message');
    const settingsLabel = screen.getByTestId('press-action-label');
    const product = screen.getByTestId('press-contact-product');
    const analogy = screen.getByTestId('press-analogy-label');
    const targetField = actionMessage.querySelector<HTMLElement>('[data-action-field="target"]');
    const stiffnessField = actionMessage.querySelector<HTMLElement>('[data-action-field="stiffness"]');
    const definitions = screen.getByText('Target is where to aim. Stiffness sets how strongly the tool behaves like a spring.');
    // The two shown action fields feed the stopped-tool response and exact multiplication; the visible ruler and dial identify both scales.
    expect(relationship).toHaveClass('@container/press-primary', 'text-text', 'gap-2');
    expect(packet).toHaveClass('basis-full', 'text-text', 'gap-1');
    expect([...relationship.children]).toEqual([primary, controllerOutput]);
    expect([...packet.children]).toEqual([relationship, nativeControls]);
    expect([...nativeControls.children]).toEqual([screen.getByTestId('press-chosen-settings'), screen.getByTestId('press-settings'), screen.getByTestId('press-run')]);
    expect(relationship.nextElementSibling).toBe(nativeControls);
    expect(packet.querySelectorAll('button, input')).toHaveLength(5);
    expect(screen.getByTestId('press-chosen-settings')).toHaveTextContent(/^Chosen settings$/);
    expect(relationship.querySelectorAll('button, input, select, textarea')).toHaveLength(0);
    expect(packet.querySelectorAll('[data-action-field]')).toHaveLength(2);
    expect(actionClause.tagName).toBe('SPAN');
    expect(actionClause).toHaveClass('block');
    expect(actionClause.firstElementChild).toBe(settingsLabel);
    expect(primary.tagName).toBe('P');
    expect(primary.textContent).toBe('An action sends two settings: target +2 and stiffness 2;');
    expect(primary).toHaveClass('grid', 'min-w-0', 'gap-1', 'text-[20px]', 'font-semibold', 'leading-[1.3]');
    expect(primary).toBeVisible();
    expect(primary.closest('details')).toBeNull();
    expect(primary.closest('[hidden], [aria-hidden="true"]')).toBeNull();
    expect([...primary.children]).toEqual([actionClause]);
    expect(primary.querySelectorAll('p,br')).toHaveLength(0);
    expect(contactClause.tagName).toBe('SPAN');
    expect(contactClause.className).toBe('');
    expect(contactClause.textContent).toBe('The surface stops the tool.');
    expect(contactClause).toBeVisible();
    const sentRule = screen.getByTestId('press-sent-rule');
    expect(contactClause.parentElement).toBe(contactCondition);
    expect(contactClause.previousElementSibling).toBe(screen.getByTestId('press-position-tool-key'));
    expect(contactClause.nextElementSibling).toBeNull();
    expect([...sentRule.children]).toEqual([screen.getByTestId('press-gap-output-connector'), screen.getByTestId('press-product-rule')]);
    expect(sentRule.parentElement).toBe(product);
    expect([...sendPath.children]).toEqual([sendConnector, controllerHeading]);
    expect(sendPath.tagName).toBe('DIV');
    expect(sendPath.parentElement).toBe(controllerOutput);
    expect(sendPath.nextElementSibling).toBe(product);
    expect(screen.getByTestId('press-response-label').parentElement).toBe(product);
    expect(screen.getByTestId('press-response-label').nextElementSibling).toBe(contactCondition);
    expect(generalRule.textContent).toBe('push equals stiffness times target gap.');
    expect(generalRule.tagName).toBe('SPAN');
    expect(generalRule).toHaveClass('inline');
    expect(generalRule.parentElement).toBe(screen.getByTestId('press-product-rule'));
    expect(generalRule.closest('p')).toBe(sentRule);
    expect(generalRule.previousElementSibling).toBeNull();
    expect(generalRule.nextElementSibling).toBeNull();
    expect([...generalRule.children]).toEqual([]);
    expect(relationship.querySelectorAll('[data-testid="press-general-rule"]')).toHaveLength(1);
    expect(generalRule.className).not.toMatch(/whitespace-nowrap|overflow-hidden|text-ellipsis|break-all/);
    expect(contactCondition).toHaveClass('text-[14px]');
    expect(contactCondition).not.toHaveClass('font-semibold', 'text-[18px]');
    expect(settingsLabel.className).not.toMatch(/text-|font-|hidden/);
    expect(packet).toBeVisible();
    expect(packet.closest('details, [hidden], [aria-hidden="true"]')).toBeNull();
    expect(screen.queryByTestId('press-gap-input')).not.toBeInTheDocument();
    expect(controllerOutput).toHaveAccessibleName('Controller');
    expect(controllerOutput).toHaveAccessibleDescription('uses these settings to make the tool act like a spring.');
    expect(document.getElementById(controllerOutput.getAttribute('aria-describedby')!)).toBe(screen.getByTestId('press-controller-role'));
    expect(screen.getByTestId('press-controller-role')).toBeVisible();
    expect([...controllerOutput.children]).toEqual([sendPath, product]);
    expect([...controllerHeading.children]).toEqual([controllerHeading.querySelector(':scope > p')]);
    expect(controllerHeading.previousElementSibling).toBe(sendConnector);
    expect(controllerHeading).not.toContainElement(sendConnector);
    expect(controllerHeading.querySelector(':scope > p')).toHaveTextContent(/^Controller: uses these settings to make the tool act like a spring\.$/);
    expect(sendConnector).toHaveAttribute('aria-hidden', 'true');
    expect(sendConnector).toHaveAttribute('data-from', 'press-action-message');
    expect(sendConnector).toHaveAttribute('data-to', 'press-controller-output');
    expect(sendConnector).toHaveClass('pointer-events-none');
    expect(sendConnector.tagName).toBe('svg');
    expect(sendConnector).toHaveAttribute('viewBox', '0 0 20 32');
    expect(sendConnector).toHaveAttribute('stroke', 'currentColor');
    expect(sendConnector.querySelector('path')).toHaveAttribute('d', 'M10 0V28m-5-5 5 5 5-5');
    expect(controllerOutput).toBeVisible();
    expect(controllerOutput).toHaveClass('gap-2');
    expect(product).toHaveClass('gap-2');
    expect(controllerOutput).toContainElement(calculation);
    expect(controllerOutput).not.toContainElement(screen.getByTestId('press-drawing'));
    const position = screen.getByTestId('press-position-diagram');
    expect([...product.children]).toEqual([screen.getByTestId('press-response-label'), contactCondition, responseDiagram, sentRule, screen.getByTestId('press-result-with-dial'), screen.getByTestId('press-scale-definitions')]);
    expect(product).toContainElement(generalRule);
    expect(contactCondition.nextElementSibling).toBe(responseDiagram);
    expect(calculation.parentElement).toBe(screen.getByTestId('press-result-with-dial'));
    expect(calculation.parentElement?.children).toHaveLength(1);
    expect(descriptions.nextElementSibling).toBe(equation);
    expect(primary.compareDocumentPosition(calculation) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(responseDiagram).toHaveClass('min-w-0');
    expect(responseDiagram).not.toHaveClass('iso');
    expect(screen.getByTestId('press-response-label')).toHaveTextContent(/^Shown response$/);
    expect(screen.getByTestId('press-response-label')).toBeVisible();
    expectPushDial(4);
    const scaleDefinition = screen.getByTestId('press-scale-definitions');
    expect(scaleDefinition).toBeVisible();
    expect(scaleDefinition).not.toHaveAttribute('data-figure-status');
    expect(responseDiagram.nextElementSibling).toBe(sentRule);
    expect(calculation.parentElement?.nextElementSibling).toBe(scaleDefinition);
    expect(scaleDefinition.closest('details')).toBeNull();
    expect(relationship.closest('figure')!.querySelectorAll('[data-figure-status]')).toHaveLength(1);
    expect(position.parentElement).toBe(responseDiagram);
    expect(responseDiagram).not.toHaveAttribute('data-anatomy-drawing');
    expect(causalStage.querySelectorAll('[data-anatomy-drawing]')).toHaveLength(1);
    expect(position.closest('[data-anatomy-drawing]')).toBe(packet.parentElement);
    expect(responseDiagram.firstElementChild).toBe(position);
    expect([...responseDiagram.children]).toEqual([position, screen.getByTestId('press-push-dial')]);
    expect(product).toContainElement(position);
    expect(controllerOutput).toContainElement(position);
    expect(causalStage).toContainElement(position);
    expect(causalStage).toContainElement(contactCondition);
    expect(causalStage).toContainElement(generalRule);
    expect(causalStage).toContainElement(calculation);
    expect(position.closest('[data-figure-stage]')).toBe(causalStage);
    expect(contactCondition.closest('[data-figure-stage]')).toBe(causalStage);
    expect(generalRule.closest('[data-figure-stage]')).toBe(causalStage);
    expect(calculation.closest('[data-figure-stage]')).toBe(causalStage);
    expect(nativeControls).not.toContainElement(position);
    expect(nativeControls).not.toContainElement(generalRule);
    expect(nativeControls).not.toContainElement(calculation);
    expect(position.parentElement!.children).toHaveLength(2);
    expect(position).toBeVisible();
    expect(position.closest('details, [hidden], [aria-hidden="true"]')).toBeNull();
    expect(position).toHaveAttribute('data-target', '2');
    expect(position).toHaveAttribute('data-tool', '0');
    expect(position).toHaveAttribute('data-gap', '2');
    expect(position).toHaveAttribute('data-push', '4');
    expect(screen.getByTestId('press-position-condition')).toHaveTextContent(/^The surface stops the tool\.$/);
    expect(screen.getByTestId('press-shown-target')).toHaveTextContent(/^Shown target: 2 marks past surface$/);
    expect(screen.getByTestId('press-position-surface')).toHaveStyle({ top: '40%' });
    expect(screen.getByTestId('press-position-tool')).toHaveStyle({ top: '40%' });
    expect(screen.getByTestId('press-position-target')).toHaveStyle({ top: '80%' });
    expect(screen.getByTestId('press-position-gap')).toHaveStyle({ top: '40%', height: '40%' });
    expect(screen.getByTestId('press-position-marks')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('press-position-marks')).toHaveClass('pointer-events-none');
    const toolKey = screen.getByTestId('press-position-tool-key');
    expect(toolKey).toHaveAttribute('aria-hidden', 'true');
    expect(toolKey.parentElement).toBe(screen.getByTestId('press-position-condition'));
    for (const mark of [toolKey, screen.getByTestId('press-position-tool')]) {
      expect(mark).toHaveClass('h-3', 'w-3', 'bg-current', 'forced-colors:bg-[CanvasText]!');
    }
    expect(screen.getByTestId('press-method-analogy')).toHaveAttribute('data-anatomy-drawing');
    expect(screen.getByTestId('press-position-target')).toHaveClass('border-dashed');
    const methodFold = screen.getByTestId('press-method-analogy').closest('details')!;
    expect(methodFold).toHaveAttribute('data-figure-fold', 'method');
    expect(methodFold).not.toHaveAttribute('open');
    expect(proof).not.toBeVisible();
    const summary = methodFold.querySelector('summary')!;
    expect(summary).toHaveTextContent(/^How this was made$/);
    fireEvent.click(summary);
    expect(methodFold).toHaveAttribute('open');
    expect(contactCondition.textContent?.trim()).toBe('The surface stops the tool.');
    expect(contactCondition.parentElement).toBe(product);
    expect(position).not.toContainElement(contactCondition);
    expect(primary.lastElementChild).toBe(actionClause);
    expect(screen.queryByTestId('press-condition-clause')).not.toBeInTheDocument();
    expect(screen.queryByTestId('press-contact-condition')).not.toBeInTheDocument();
    expect(primary.nextElementSibling).toBe(controllerOutput);
    expect(generalRule).toBeVisible();
    expect(generalRule.closest('details')).toBeNull();
    // Named whole-word operands form one vertical product; the unchanged intrinsic arithmetic follows.
    expect([...calculation.children]).toEqual([descriptions, equation]);
    expect(calculation).toHaveClass('grid', 'min-w-0', 'gap-1');
    expect(equation).toHaveClass('flex', 'flex-nowrap', 'items-baseline', 'gap-0.5', 'font-mono', 'text-[clamp(1rem,8cqi,1.5rem)]');
    expect(equation.className).not.toMatch(/grid-cols|grid-rows|overflow-hidden|text-ellipsis/);
    expect([...equation.querySelectorAll('[data-operation-value], [data-operation-symbol]')].map((node) => node.getAttribute('data-operation-value') ?? node.getAttribute('data-operation-symbol'))).toEqual(['stiffness', 'multiply', 'gap', 'equals', 'push']);
    expect([...equation.querySelectorAll('[data-operation-value], [data-operation-symbol]')].map((node) => node.textContent)).toEqual(['2', '×', '2', '=', '4']);
    expect([...calculation.querySelectorAll('[data-operation-label]')].map((node) => node.textContent)).toEqual(['sent stiffness', 'target gap', 'push']);
    expect([...calculation.querySelectorAll('[data-operation-value]')].map((node) => node.textContent)).toEqual(['2', '2', '4']);
    expect([...calculation.querySelectorAll('[data-description-value]')].map((node) => node.textContent)).toEqual(['2', '2', '4']);
    expect(equation.children).toHaveLength(3);
    expect(equation.children[0]).toBe(screen.getByTestId('press-stiffness-operand'));
    expect(equation.children[1]).toBe(screen.getByTestId('press-gap-term'));
    expect(equation.children[2]).toBe(screen.getByTestId('press-result-term'));
    expect([...screen.getByTestId('press-gap-term').children]).toEqual([calculation.querySelector('[data-operation-symbol="multiply"]'), screen.getByTestId('press-gap-operand')]);
    expect([...screen.getByTestId('press-result-term').children]).toEqual([calculation.querySelector('[data-operation-symbol="equals"]'), screen.getByTestId('press-push-result')]);
    for (const operand of [screen.getByTestId('press-stiffness-operand'), screen.getByTestId('press-gap-operand'), screen.getByTestId('press-push-result')]) {
      expect(operand).toHaveClass('shrink-0');
      const value = operand.querySelector<HTMLElement>('[data-operation-value]')!;
      expect(value.tagName).toBe('P');
      expect(value).toHaveClass('whitespace-nowrap', 'font-mono');
      const key = value.getAttribute('data-operation-value');
      const descriptor = screen.getByTestId(`press-${key}-description`);
      expect(document.getElementById(value.getAttribute('aria-describedby')!)).toBe(descriptor);
      expect(descriptor.parentElement).toBe(screen.getByTestId(`press-${key}-product-row`));
      expect(descriptor.parentElement?.parentElement).toBe(descriptions);
      expect(descriptor).toBeVisible();
      expect(descriptor.closest('details, [hidden], [aria-hidden="true"]')).toBeNull();
      expect(descriptor.querySelector('[data-operation-label]')).toHaveClass('font-semibold');
      expect(descriptor.querySelector('[data-description-value]')).toHaveClass('whitespace-nowrap', 'font-mono');
    }
    for (const term of [screen.getByTestId('press-gap-term'), screen.getByTestId('press-result-term')]) {
      expect(term).toHaveClass('flex', 'shrink-0', 'items-baseline', 'gap-0.5');
      expect(term.querySelector('[data-operation-symbol]')?.tagName).toBe('P');
      expect(term.querySelector('[data-operation-symbol]')).toHaveClass('shrink-0');
    }
    expect(descriptions).toHaveClass('grid', 'min-w-0', 'gap-1', 'font-sans', 'text-[16px]', 'leading-normal');
    expect(descriptions).not.toHaveClass('flex');
    expect([...descriptions.children]).toEqual(['stiffness', 'gap', 'push'].map(key => screen.getByTestId(`press-${key}-product-row`)));
    expect(screen.getByTestId('press-stiffness-product-row').children).toHaveLength(1);
    expect(screen.getByTestId('press-stiffness-product-row').firstElementChild).toBe(screen.getByTestId('press-stiffness-description'));
    for (const key of ['stiffness', 'gap', 'push']) {
      const row = screen.getByTestId(`press-${key}-product-row`);
      expect(row).toHaveClass('flex', 'min-w-0', 'flex-wrap', 'items-baseline', 'gap-x-2', 'gap-y-1');
      expect(row.className).not.toMatch(/grid-cols|grid-rows|whitespace-nowrap|overflow-hidden|text-ellipsis|break-all/);
    }
    for (const [key, symbol, word] of [['gap', '×', 'times'], ['push', '=', 'equals']]) {
      const operator = screen.getByTestId(`press-${key}-product-operator`);
      const descriptor = screen.getByTestId(`press-${key}-description`);
      expect([...screen.getByTestId(`press-${key}-product-row`).children]).toEqual([operator, descriptor]);
      expect(operator).toHaveTextContent(`${symbol} ${word}`);
      expect(operator.tagName).toBe('P');
      expect(operator).toHaveClass('inline-flex', 'shrink-0', 'items-baseline', 'gap-1', 'font-semibold');
      expect(operator).not.toHaveAttribute('aria-hidden');
      expect(operator.firstElementChild).toHaveAttribute('aria-hidden', 'true');
      expect(operator.firstElementChild).toHaveTextContent(symbol);
      expect(operator.lastElementChild).toHaveTextContent(word);
      expect(descriptor).not.toContainElement(operator);
    }
    expect(descriptions.querySelectorAll('[class*="overflow-wrap"], [class*="break-all"], [class*="overflow-hidden"], [class*="text-ellipsis"]')).toHaveLength(0);
    expect(screen.getByTestId('press-stiffness-description')).toHaveTextContent(/^sent stiffness: 2$/);
    expect(screen.getByTestId('press-gap-description')).toHaveTextContent(/^target gap: 2 ruler marks$/);
    const gapKey = screen.getByTestId('press-position-gap-key');
    const gapDescription = screen.getByTestId('press-gap-description');
    expect(gapKey).toHaveAttribute('aria-hidden', 'true');
    expect(gapKey.textContent).toBe('');
    expect(gapKey.parentElement).toBe(gapDescription);
    expect(gapDescription.firstElementChild).toBe(gapKey);
    expect(gapKey.nextElementSibling).toBe(gapDescription.querySelector('[data-operation-label="gap"]'));
    expect(gapKey).toHaveClass('inline-block', 'h-3', 'w-2', 'border-y', 'border-r', 'border-current');
    expect(screen.getByTestId('press-position-gap')).toHaveClass('w-2', 'border-y', 'border-r', 'border-current');
    expect(gapKey).toBeVisible();
    expect(screen.getByTestId('press-push-description')).toHaveTextContent(/^push: 4 dial marks$/);
    // The complete original physical evidence is visible after opening its existing native method fold and stays bound to the gap operand.
    expect([...proof.children]).toEqual([definitions, analogyGroup]);
    expect(proof).toHaveClass('@min-[38em]/press:grid-cols-2');
    expect(screen.getByTestId('press-method-analogy')).toContainElement(proof);
    expect(methodFold).toContainElement(proof);
    expect(screen.getByTestId('press-stage-frame')).not.toContainElement(proof);
    expect(definitions.nextElementSibling).toBe(analogyGroup);
    expect(definitions).toBeVisible();
    expect(definitions.closest('details')).toBe(methodFold);
    expect(screen.getByTestId('press-run').compareDocumentPosition(proof) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(analogyGroup.firstElementChild).toBe(analogy);
    expect(analogy).toHaveTextContent(/^Spring analogy: target gap$/);
    expect(analogy.nextElementSibling).toBe(screen.getByTestId('press-drawing'));
    expect(analogyGroup).toContainElement(screen.getByTestId('press-drawing'));
    expect(screen.getByTestId('press-gap-operand')).toHaveAccessibleDescription(/The surface stops the tool.*Marked target gap: 2 ruler marks from the stopped tool to the target level\./);
    expect(document.getElementById(screen.getByTestId('press-gap-operand').getAttribute('aria-describedby')!)).toBe(screen.getByTestId('press-drawing'));
    expect(document.getElementById(screen.getByTestId('press-drawing').getAttribute('aria-labelledby')!)).toBe(calculation.querySelector('[data-operation-label="gap"]'));
    expect(screen.queryByTestId('press-causal-story')).not.toBeInTheDocument();
    expect(settingsLabel).toHaveTextContent(/^An action sends two settings: target \+2 and stiffness 2;$/);
    expect(settingsLabel.textContent).toBe('An action sends two settings: target +2 and stiffness 2;');
    expect(settingsLabel).toHaveAttribute('aria-label', 'An action sends two settings: target and stiffness');
    expect(settingsLabel.parentElement).toBe(actionClause);
    expect(actionMessage.parentElement).toBe(settingsLabel);
    expect(definitions.parentElement).toBe(proof);
    expect(screen.getByTestId('press-drawing').firstElementChild).toBe(screen.getByTestId('press-mechanism'));
    expect(screen.getByTestId('press-mechanism').nextElementSibling).toBe(screen.getByTestId('press-gap-canvas'));
    expect(actionMessage.querySelectorAll('[data-action-field]')).toHaveLength(2);
    expect(targetField).toHaveTextContent(/^target \+2$/);
    expect(stiffnessField).toHaveTextContent(/^stiffness 2;$/);
    expect(actionMessage).toContainElement(targetField);
    expect(actionMessage).toContainElement(stiffnessField);
    expect(actionMessage.querySelectorAll('input, button, select, textarea')).toHaveLength(0);
    expect([...actionMessage.querySelectorAll('[data-action-value]')].map(node => node.textContent)).toEqual(['+2', '2']);
    expect(actionMessage.querySelector('[data-action-value="target"]')?.parentElement).toBe(targetField);
    expect(actionMessage.querySelector('[data-action-value="stiffness"]')?.parentElement).toBe(stiffnessField);
    expect(actionMessage).toHaveClass('flex', 'min-w-0', 'flex-wrap', 'items-baseline', 'gap-x-2', 'gap-y-1');
    expect(targetField).toHaveClass('inline-block');
    expect(stiffnessField).toHaveClass('inline-block');
    expect(targetField).toHaveClass('min-w-min');
    expect(stiffnessField).toHaveClass('min-w-min');
    for (const field of [targetField, stiffnessField]) {
      expect(field!.className).not.toMatch(/border|px-|py-/);
      expect(field!.closest('p')).toBe(primary);
    }
    expect(screen.queryByTestId('press-output-connector')).not.toBeInTheDocument();
    expect(relationship.compareDocumentPosition(screen.getByRole('slider', { name: 'Target' })) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.getByRole('slider', { name: 'Target' }).compareDocumentPosition(proof) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    const drawing = screen.getByTestId('press-drawing');
    expect(drawing).toHaveRole('group');
    expect(drawing).toHaveAccessibleName('target gap');
    expect(drawing).toHaveAttribute('data-spring', 'medium');
    expect(drawing).toHaveAttribute('data-target', '2');
    expect(drawing).toHaveAttribute('data-tool', '0');
    expect(drawing).toHaveAttribute('data-push', '4');
    expect(screen.getByTestId('press-gap-canvas')).toHaveClass('relative', 'mx-auto', 'w-3/5', 'max-w-[14rem]', '@min-[38em]/press:w-full');
    const gapGuide = screen.getByTestId('press-gap-guide');
    expect(gapGuide).toHaveAttribute('aria-hidden', 'true');
    expect(gapGuide).toHaveAttribute('data-target-reference', 'virtual');
    expect(gapGuide).toHaveAttribute('data-gap', '2');
    expect(Number(gapGuide.getAttribute('data-tool-y'))).toBeCloseTo(388.50778791731744, 9);
    expect(Number(gapGuide.getAttribute('data-target-y'))).toBeCloseTo(422.9864058391528, 9);
    expect(screen.getByTestId('press-gap-key')).toBeVisible();
    expect(screen.getByTestId('press-gap-key').closest('details')).toBe(methodFold);
    expect(screen.getByTestId('press-gap-statement')).toHaveTextContent('Marked target gap: 2 ruler marks from the stopped tool to the target level.');
    expect(drawing).toContainElement(screen.getByTestId('press-gap-key'));
    expect(screen.getByTestId('press-calculation')).toHaveTextContent('sent stiffness: 2 × times target gap: 2 ruler marks = equals push: 4 dial marks 2 × 2 = 4');
    expect(screen.getByTestId('press-mechanism')).toHaveTextContent('The surface stops the tool.');
    const settings = screen.getByTestId('press-settings');
    expect(settings).toHaveAccessibleName('An action sends two settings: target and stiffness');
    expect(settings).toHaveAccessibleDescription('Target is where to aim. Stiffness sets how strongly the tool behaves like a spring.');
    expect(settings).toContainElement(screen.getByRole('slider', { name: 'Target' }));
    expect(settings).toContainElement(screen.getByTestId('press-spring-soft'));
    const stiffnessPresets = screen.getByRole('group', { name: /^Action stiffness$/ });
    expect(stiffnessPresets).toHaveAttribute('data-preset-group');
    expect(stiffnessPresets).toHaveAccessibleName('Action stiffness');
    expect(screen.getByText('Action stiffness')).toBeVisible();
    expect(screen.queryByRole('group', { name: /^Spring set by the movement controller$/ })).not.toBeInTheDocument();
    expect([...stiffnessPresets.querySelectorAll('button')]).toEqual([
      screen.getByTestId('press-spring-soft'),
      screen.getByTestId('press-spring-medium'),
      screen.getByTestId('press-spring-stiff'),
    ]);
    expect(settings).toContainElement(stiffnessPresets);

    expect(screen.getByTestId('press-calculation')).toHaveAccessibleName('Stiffness times target gap equals push');
    expect(screen.getByTestId('press-mechanism').closest('details')).toBe(methodFold);
    expect(settingsLabel.compareDocumentPosition(screen.getByTestId('press-spring-soft')) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    for (const native of packet.querySelectorAll('button, input')) {
      expect(actionClause.compareDocumentPosition(native) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
      expect(relationship.compareDocumentPosition(native) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
      expect(position.compareDocumentPosition(native) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
      expect(generalRule.compareDocumentPosition(native) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
      expect(calculation.compareDocumentPosition(native) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    }
    for (const explanation of [packet, relationship, actionClause, position, primary, calculation, equation, descriptions]) {
      expect(explanation.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    }
    expect(document.getElementById(settings.getAttribute('aria-labelledby')!)).toBe(settingsLabel);
    expect(document.getElementById(settings.getAttribute('aria-describedby')!)).toBe(screen.getByText('Target is where to aim. Stiffness sets how strongly the tool behaves like a spring.'));
    const stage = screen.getByTestId('press-stage-frame');
    const caption = screen.getByTestId('press-stage-frame').closest('figure[data-figure-frame="impedance-press"]')?.querySelector(':scope > figcaption[data-figure-caption]');
    expect(caption).toBeInTheDocument();
    expect(caption?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Once the surface stops the tool, push equals stiffness times how far the target sits past it.');
    expect(stage.querySelector('[data-readout]')).toHaveTextContent('Medium · 2 marks past surface · push 4 dial marks');
    expect(screen.getByTestId('press-scale-definitions')).toHaveTextContent('Ruler: target gap. Dial: push.');
    expect(stage.querySelector('[data-figure-status]')).toHaveTextContent('Schematic ruler and dial marks, with no physical units: springs give 1, 2 or 4 dial marks per ruler mark.');
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The one lit part is the fitted spring: its back half, its seat and its front half.
    const lit = [...svg.querySelectorAll('[data-tone="lit"], [data-lit]')];
    expect(lit).toHaveLength(3);
    for (const node of lit) expect(node.closest('[data-part]')).toHaveAttribute('data-part', 'tool-low');
    expect(svg.getAttribute('aria-label')).toMatch(/medium spring is squeezed/);
    const nativeActions = [...relationship.closest('figure')!.querySelectorAll('button, input, summary')];
    expect(nativeActions).toHaveLength(6);
    expect(nativeActions.map((node) => node.tagName)).toEqual(['BUTTON', 'BUTTON', 'BUTTON', 'INPUT', 'BUTTON', 'SUMMARY']);
    expect(nativeActions.map((node) => node.tagName === 'INPUT' ? node.getAttribute('type') : node.textContent?.trim())).toEqual(['Soft', 'Medium', 'Stiff', 'range', 'Run the press', 'How this was made']);

  });

  it('describes the drawing with the method paragraph that explains the press', () => {
    render(<ImpedancePress />);
    const svg = screen.getByTestId('press-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      /^The press is that law made of parts\./,
    );
  });

  it('swaps the spring and keeps the target: the stiff spring pushes four times the soft one', () => {
    render(<ImpedancePress />);
    fireEvent.click(screen.getByTestId('press-spring-stiff'));
    const drawing = screen.getByTestId('press-drawing');
    expect(drawing).toHaveAttribute('data-push', String(pushFor('stiff', 2)));
    expect(screen.getByTestId('press-calculation')).toHaveTextContent('sent stiffness: 4 × times target gap: 2 ruler marks = equals push: 8 dial marks 4 × 2 = 8');
    expect(screen.getByTestId('press-spring-stiff')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('press-spring-soft'));
    expect(drawing).toHaveAttribute('data-push', String(pushFor('soft', 2)));
    expect(screen.getByTestId('press-calculation')).toHaveTextContent('sent stiffness: 1 × times target gap: 2 ruler marks = equals push: 2 dial marks 1 × 2 = 2');
    expect(Number(drawing.getAttribute('data-push')) * 4).toBe(pushFor('stiff', 2));
  });

  it('moves the target from the slider, in words for assistive technology, at once under reduced motion', async () => {
    still();
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    render(<ImpedancePress />);
    const slider = screen.getByRole('slider', { name: 'Target' });
    expect(slider).toHaveValue('2');
    fireEvent.change(slider, { target: { value: '-1.5' } });
    // One frame later the crosshead stands at the new target: no easing under reduced motion.
    await act(async () => {
      vi.advanceTimersByTime(20);
    });
    vi.useRealTimers();
    expect(slider).toHaveAttribute('aria-valuetext', 'target 1.5 marks short of the surface: the tool rides on the target and pushes on nothing');
    expect(screen.getByTestId('press-target')).toHaveTextContent('1.5 marks short of surface');
    const drawing = screen.getByTestId('press-drawing');
    expect(drawing).toHaveAttribute('data-target', '-1.5');
    expect(screen.getByTestId('press-action-message').textContent).toBe('target -1.5 and stiffness 2;');
    expect(screen.getByTestId('press-settings')).toHaveAccessibleName('An action sends two settings: target and stiffness');
    expect(drawing).toHaveAttribute('data-push', '0');
    expect(screen.getByTestId('press-calculation')).toHaveTextContent('sent stiffness: 2 × times target gap: 0 ruler marks = equals push: 0 dial marks 2 × 0 = 0');
    expect(screen.getByTestId('press-gap-guide')).toHaveAttribute('data-gap', '0');
    expect(screen.queryByTestId('press-gap-target-line')).not.toBeInTheDocument();
    expect(screen.getByTestId('press-gap-statement')).toHaveTextContent('Tool follows target. Marked target gap: 0 ruler marks.');
    expect(screen.getByTestId('press-gap-key')).not.toHaveTextContent(/stopped/i);
    expect(screen.getByTestId('press-mechanism')).toHaveTextContent('Before contact, the tool follows its target without pushing.');
    expect(screen.getByTestId('press-mechanism')).not.toHaveTextContent('The surface stops the tool.');
    expect(screen.getByTestId('press-relationship')).not.toHaveTextContent('The surface stops the tool.');
    expect(screen.getByTestId('press-position-condition')).toHaveTextContent('Before contact, the tool follows its target without pushing.');
    expect(screen.getByTestId('press-general-rule')).toHaveTextContent(/^push equals stiffness times target gap\.$/);
    expect(screen.getByTestId('press-general-rule').parentElement).toBe(screen.getByTestId('press-product-rule'));
    expect(screen.getByTestId('press-contact-clause')).toHaveTextContent(screen.getByTestId('press-position-condition').textContent!.trim());
    expect(screen.getByTestId('press-stage-frame').querySelector('[data-readout]')).toHaveTextContent('Medium · 1.5 marks short of surface · no push');
    expect(screen.getByText('This action sends target and stiffness before contact')).toBeInTheDocument();
    expect(screen.getByText('This action sends target and stiffness before contact')).toHaveAttribute('data-figure-title');
    expect(screen.getByTestId('press-stage-frame')).toHaveTextContent('Before contact, the tool follows the target and pushes on nothing.');
    expect(targetValue(0)).toBe('on the surface');
    expect(targetValue(1)).toBe('1 mark past surface');
    expect(valueTextFor('stiff', 3)).toBe('target 3 marks past the surface: the tool stops on the surface and the stiff spring pushes 12');
  });

  it('eases the crosshead to a new target', async () => {
    for (const [target, expected, hint] of [
      [0.7, 'Medium · 0.7 marks past surface · push 1.4 dial marks', 'The surface stops the tool. Stiffness 2 times a target gap of 0.7 ruler marks gives 1.4 dial marks of push.'],
      [2.3, 'Medium · 2.3 marks past surface · push 4.6 dial marks', 'The surface stops the tool. Stiffness 2 times a target gap of 2.3 ruler marks gives 4.6 dial marks of push.'],
      [-0.04, 'Medium · on the surface · no push', 'Target and tool meet the surface with no gap, so there is no push.'],
      [0.04, 'Medium · on the surface · no push', 'Target and tool meet the surface with no gap, so there is no push.'],
    ] as const) {
      expect(displayReadoutFor('medium', Math.round(target * 10) / 10)).toBe(expected);
      expect(displayHintFor('medium', target)).toBe(hint);
    }
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      render(<ImpedancePress />);
      fireEvent.change(screen.getByRole('slider', { name: 'Target' }), { target: { value: '0' } });
      const drawing = screen.getByTestId('press-drawing');
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      const between = Number(drawing.getAttribute('data-target'));
      expect(between).toBeGreaterThan(0);
      expect(between).toBeLessThan(2);
      expect(screen.getByTestId('press-target')).toHaveTextContent('on the surface');
      const shownGap = Math.round(between * 10) / 10;
      expect(screen.getByTestId('press-action-message').textContent).toBe(`target +${shownGap} and stiffness 2;`);
      expect(screen.getByTestId('press-action-message').querySelector('[data-action-value="target"]')).toHaveTextContent(`+${shownGap}`);
      expect(screen.getByTestId('press-action-message').querySelector('[data-action-value="stiffness"]')).toHaveTextContent(/^2$/);
      expect(screen.getByTestId('press-settings')).toHaveAccessibleName('An action sends two settings: target and stiffness');
      expect(screen.getByTestId('press-gap-operand').querySelector('[data-operation-value="gap"]')).toHaveTextContent(String(shownGap));
      expect(screen.getByTestId('press-push-result').querySelector('[data-operation-value="push"]')).toHaveTextContent(String(Number((2 * shownGap).toFixed(1))));
      expect(shownGap).toBeGreaterThan(0);

      await act(async () => {
        vi.advanceTimersByTime(1050);
      });
      const nearSurface = Number(drawing.getAttribute('data-target'));
      expect(nearSurface).toBeGreaterThan(0);
      expect(nearSurface).toBeLessThan(0.05);
      expect(screen.getByTestId('press-stage-frame').querySelector('[data-readout]')).toHaveTextContent('Medium · on the surface · no push');
      expect(screen.getByTestId('press-mechanism')).toHaveTextContent('No target gap means no push.');
      expect(screen.getByText('This action sends target and stiffness at the surface')).toHaveAttribute('data-figure-title');
      expect(screen.getByTestId('press-position-condition')).toHaveTextContent('Tool and target meet the surface without pushing.');
      expect(screen.getByTestId('press-general-rule')).toHaveTextContent(/^push equals stiffness times target gap\.$/);
    expect(screen.getByTestId('press-general-rule').parentElement).toBe(screen.getByTestId('press-product-rule'));
    expect(screen.getByTestId('press-contact-clause')).toHaveTextContent(screen.getByTestId('press-position-condition').textContent!.trim());
      expect(screen.getByTestId('press-calculation')).toHaveTextContent('sent stiffness: 2 × times target gap: 0 ruler marks = equals push: 0 dial marks 2 × 0 = 0');
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(drawing).toHaveAttribute('data-target', '0');
      expect(screen.getByTestId('press-action-message').textContent).toBe('target 0 and stiffness 2;');
      expect(screen.getByTestId('press-settings')).toHaveAccessibleName('An action sends two settings: target and stiffness');
      expect(screen.getByText('This action sends target and stiffness at the surface')).toHaveAttribute('data-figure-title');
      expect(screen.getByTestId('press-gap-guide')).toHaveAttribute('data-gap', '0');
      expect(screen.queryByTestId('press-gap-target-line')).not.toBeInTheDocument();
      expect(screen.getByTestId('press-gap-statement')).toHaveTextContent('Tool and target meet at the surface. Marked target gap: 0 ruler marks.');
      expect(drawing.querySelector('svg')).toHaveAccessibleName(/The target meets the pan, so the tool just touches it and the dial reads nothing\./);
    } finally {
      vi.useRealTimers();
    }
  });

  it('runs the press only when asked, with no pressed state, and jumps to the end under reduced motion', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      render(<ImpedancePress />);
      const run = screen.getByTestId('press-run');
      expect(run).not.toHaveAttribute('aria-pressed');
      expect(run).toHaveTextContent('Run the press');
      fireEvent.click(run);
      expect(run).toHaveTextContent('Stop the press');
      expect(run).not.toHaveAttribute('aria-pressed');
      await act(async () => {
        vi.advanceTimersByTime(RUN_SECONDS * 500);
      });
      const drawing = screen.getByTestId('press-drawing');
      expect(Number(drawing.getAttribute('data-target'))).toBeLessThan(TARGET_MAX);
      await act(async () => {
        vi.advanceTimersByTime(RUN_SECONDS * 1000);
      });
      expect(drawing).toHaveAttribute('data-target', String(TARGET_MAX));
      expect(run).toHaveTextContent('Run the press');
    } finally {
      vi.useRealTimers();
    }
    still();
    const { container } = render(<ImpedancePress />);
    fireEvent.click(container.querySelector('[data-testid="press-run"]')!);
    expect(container.querySelector('[data-testid="press-drawing"]')).toHaveAttribute('data-target', String(TARGET_MAX));
  });

  it('keeps all visible descriptors equal to the shown arithmetic during native preset, easing, free and zero changes', async () => {
    const agree = (rate: number, gap: number, push: number) => {
      const calculation = screen.getByTestId('press-calculation');
      const primary = [...calculation.querySelectorAll<HTMLElement>('[data-operation-value]')];
      const repeated = [...calculation.querySelectorAll<HTMLElement>('[data-description-value]')];
      const expected = [String(rate), String(gap), String(push)];
      expect(primary).toHaveLength(3);
      expect(repeated).toHaveLength(3);
      expect(primary.map(node => node.textContent)).toEqual(expected);
      expect(repeated.map(node => node.textContent)).toEqual(expected);
      for (const [index, value] of primary.entries()) {
        const descriptor = document.getElementById(value.getAttribute('aria-describedby')!);
        expect(descriptor).toContainElement(repeated[index]);
        expect(repeated[index]).toHaveAttribute('data-description-value', value.getAttribute('data-operation-value'));
      }
      expectPushDial(push);
      expect(screen.getByTestId('press-gap-description')).toHaveTextContent(`target gap: ${gap} ruler marks`);
      expect(screen.getByTestId('press-push-description')).toHaveTextContent(`push: ${push} dial marks`);
    };
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      render(<ImpedancePress />);
      agree(2, 2, 4);
      for (const [name, rate] of [['soft', 1], ['medium', 2], ['stiff', 4]] as const) {
        fireEvent.click(screen.getByTestId(`press-spring-${name}`));
        agree(rate, 2, rate * 2);
      }
      fireEvent.change(screen.getByRole('slider', { name: 'Target' }), { target: { value: '3' } });
      expect(screen.getByRole('slider', { name: 'Target' })).toHaveValue('3');
      agree(4, 2, 8);
      await act(async () => { vi.advanceTimersByTime(500); });
      expect(Number(screen.getByTestId('press-drawing').getAttribute('data-target'))).toBeGreaterThan(2.85);
      expect(Number(screen.getByTestId('press-drawing').getAttribute('data-target'))).toBeLessThan(2.95);
      agree(4, 2.9, 11.6);
      still();
      for (const target of [-1.5, 0]) {
        fireEvent.change(screen.getByRole('slider', { name: 'Target' }), { target: { value: String(target) } });
        await act(async () => { vi.advanceTimersByTime(20); });
        agree(4, 0, 0);
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the default position diagram true across every preset and native half-mark anchor, with its full analogy one native fold away', async () => {
    still();
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      render(<ImpedancePress />);
      const diagram = screen.getByTestId('press-position-diagram');
      const fold = screen.getByTestId('press-method-analogy').closest('details')!;
      const slider = screen.getByRole('slider', { name: 'Target' });
      const anchors = [
        [-2, 0, 0, 0], [-1.5, 10, 10, 0], [-0.5, 30, 30, 0],
        [0, 40, 40, 0], [0.5, 50, 40, 10], [1, 60, 40, 20],
        [2, 80, 40, 40], [3, 100, 40, 60],
      ] as const;
      for (const [preset, rate] of [['soft', 1], ['medium', 2], ['stiff', 4]] as const) {
        fireEvent.click(screen.getByTestId(`press-spring-${preset}`));
        for (const [target, targetPercent, toolPercent, gapPercent] of anchors) {
          fireEvent.change(slider, { target: { value: String(target) } });
          await act(async () => { vi.advanceTimersByTime(20); });
          const gap = target > 0 ? target : 0;
          expect(diagram).toBeVisible();
          expect(fold).not.toHaveAttribute('open');
          expect(screen.getByTestId('press-drawing')).not.toBeVisible();
          expect(diagram).toHaveAttribute('data-target', String(target));
          expect(diagram).toHaveAttribute('data-tool', String(target < 0 ? target : 0));
          expect(diagram).toHaveAttribute('data-gap', String(gap));
          expect(diagram).toHaveAttribute('data-push', String(rate * gap));
          expectPushDial(rate * gap);
          const ruler = screen.getByTestId('press-ruler');
          expect(ruler).toHaveClass('absolute', 'inset-y-0', 'left-0', 'border-l', 'border-current');
          expect(ruler.parentElement).toBe(screen.getByTestId('press-position-marks'));
          const ticks = [...diagram.querySelectorAll('[data-ruler-mark]')];
          expect(ticks.map(tick => Number(tick.getAttribute('data-ruler-mark')))).toEqual([-2, -1, 0, 1, 2, 3]);
          for (const tick of ticks) {
            expect(tick).toHaveStyle({ top: `${40 + 20 * Number(tick.getAttribute('data-ruler-mark'))}%` });
            expect(tick).toHaveClass('absolute', 'left-0', 'w-1', 'border-t', 'border-current');
          }
          expect(screen.getByTestId('press-position-surface')).toHaveStyle({ top: '40%' });
          expect(screen.getByTestId('press-position-target')).toHaveStyle({ top: `${targetPercent}%` });
          expect(screen.getByTestId('press-position-tool')).toHaveStyle({ top: `${toolPercent}%` });
          expect(screen.getByTestId('press-position-gap')).toHaveStyle({ top: `${toolPercent}%`, height: `${gapPercent}%` });
          const actualGap = screen.getByTestId('press-position-gap');
          const gapKey = screen.getByTestId('press-position-gap-key');
          expect(actualGap).toHaveClass(gap > 0 ? 'border-y' : 'border-0');
          expect(actualGap).toHaveClass(gap > 0 ? 'border-r' : 'border-0');
          expect(gapKey).toHaveClass('w-2', 'border-y', 'border-r', 'border-current');
          expect(gapKey).toBeVisible();
          expect(gapKey.parentElement).toBe(screen.getByTestId('press-gap-description'));
          expect(screen.getByTestId('press-gap-description')).toHaveTextContent(`target gap: ${gap} ruler marks`);
          expect([...screen.getByTestId('press-equation').querySelectorAll('[data-operation-value]')].map(node => node.textContent)).toEqual([String(rate), String(gap), String(rate * gap)]);
          expect(screen.getByTestId('press-position-condition')).toHaveTextContent(target > 0 ? 'The surface stops the tool.' : target < 0 ? 'Before contact, the tool follows its target without pushing.' : 'Tool and target meet the surface without pushing.');
          expect(screen.getByTestId('press-shown-target')).toHaveTextContent(`Shown target: ${targetValue(target)}`);
        }
      }
      fireEvent.click(fold.querySelector('summary')!);
      expect(fold).toHaveAttribute('open');
      expect(screen.getByTestId('press-drawing')).toBeVisible();
      expect(screen.getByTestId('press-gap-guide')).toBeVisible();
      expect(screen.getByTestId('press-gap-key')).toBeVisible();
      expect(diagram).toBeVisible();
      fireEvent.click(fold.querySelector('summary')!);
      expect(fold).not.toHaveAttribute('open');
      expect(screen.getByTestId('press-drawing')).not.toBeVisible();
      expect(diagram).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });

  it('distinguishes chosen settings from the shown reference during native Run, Stop and continued easing', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      render(<ImpedancePress />);
      const slider = screen.getByRole('slider', { name: 'Target' });
      const run = screen.getByTestId('press-run');
      const diagram = screen.getByTestId('press-position-diagram');
      const drawing = screen.getByTestId('press-drawing');
      const verify = () => {
        const displayed = Math.round(Number(drawing.getAttribute('data-target')) * 10) / 10;
        const gap = displayed > 0 ? displayed : 0;
        expect(diagram).toHaveAttribute('data-target', String(displayed));
        expect(diagram).toHaveAttribute('data-gap', String(gap));
        expect(diagram).toHaveAttribute('data-push', String(Number((2 * gap).toFixed(1))));
        expect(screen.getByTestId('press-shown-target')).toHaveTextContent(`Shown target: ${targetValue(displayed)}`);
        expect(screen.getByTestId('press-position-target')).toHaveStyle({ top: `${40 + 20 * displayed}%` });
        expect(screen.getByTestId('press-position-gap')).toHaveStyle({ height: `${20 * gap}%` });
      };
      expect(screen.getByTestId('press-chosen-settings')).toHaveTextContent('Chosen settings');
      expect(screen.getByTestId('press-response-label')).toHaveTextContent(/^Shown response$/);
      expect(screen.getByTestId('press-response-label')).toBeVisible();
      fireEvent.click(run);
      await act(async () => { vi.advanceTimersByTime(3300); });
      expect(slider).toHaveValue('2');
      expect(Number(drawing.getAttribute('data-target'))).toBeGreaterThan(2.5);
      expect(Number(drawing.getAttribute('data-target'))).toBeLessThan(2.7);
      verify();
      fireEvent.click(run);
      expect(run).toHaveTextContent('Run the press');
      expect(slider).toHaveValue('2.5');
      expect(Number(drawing.getAttribute('data-target'))).toBeGreaterThan(2.5);
      verify();
      await act(async () => { vi.advanceTimersByTime(100); });
      verify();
      await act(async () => { vi.advanceTimersByTime(3000); });
      expect(diagram).toHaveAttribute('data-target', '2.5');
      verify();
    } finally {
      vi.useRealTimers();
    }
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<ImpedancePress />);
    expect(html).toContain('data-figure-frame="impedance-press"');
    expect(html).toContain('Medium · 2 marks past surface · push 4 dial marks');
  });
});
