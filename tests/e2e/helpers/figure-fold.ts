import { expect, type Locator } from '@playwright/test';

/**
 * A figure frame keeps every control past its two visible ones in a fold
 * labelled "Adjust more", and its method, sources and caveats in a fold
 * labelled "How this was made". Both are closed at settle. A spec that
 * drives a control or reads a note inside one opens the fold first, the way
 * a reader would, by clicking its summary.
 */
export type FigureFoldKind = 'adjust' | 'method';

const LABEL: Record<FigureFoldKind, string> = {
  adjust: 'Adjust more',
  method: 'How this was made',
};

export function figureFold(frame: Locator, kind: FigureFoldKind): Locator {
  return frame.locator(`[data-figure-fold="${kind}"]`).first();
}

export async function openFigureFold(frame: Locator, kind: FigureFoldKind): Promise<Locator> {
  const fold = figureFold(frame, kind);
  const summary = fold.locator(':scope > summary');
  await expect(summary).toHaveText(LABEL[kind]);
  if (!(await fold.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await summary.click();
  }
  await expect(fold).toHaveJSProperty('open', true);
  return fold;
}

export const openAdjustMore = (frame: Locator) => openFigureFold(frame, 'adjust');
export const openHowThisWasMade = (frame: Locator) => openFigureFold(frame, 'method');
