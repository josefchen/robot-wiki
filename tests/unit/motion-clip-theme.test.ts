import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadTokens } from '../../scripts/generate-motion-tokens';

/**
 * Cinematic clips take every colour, font and size from the generated
 * Python theme, so a clip frame stays on the figure system's palette and
 * type scale when the tokens move. The scene files may only name roles,
 * tones and stage type sizes through clip_kit.
 */
const ROOT = join(__dirname, '../..');
const MOTION = join(ROOT, 'scripts/motion');
const THEME = readFileSync(join(MOTION, 'motion_theme.py'), 'utf8');

function pythonCode(source: string): string {
  // Docstrings and comments may mention a colour or a size in prose.
  return source
    .replace(/("""|''')[\s\S]*?\1/g, '')
    .replace(/#.*$/gm, '');
}

const CLIP_SOURCES = readdirSync(join(MOTION, 'clips'))
  .filter((name) => name.endsWith('.py'))
  .map((name) => ({
    name,
    code: pythonCode(readFileSync(join(MOTION, 'clips', name), 'utf8')),
  }));

describe('cinematic clip theme', () => {
  it('finds at least one clip scene to check', () => {
    expect(CLIP_SOURCES.map((source) => source.name)).toContain(
      'kalman_episode.py',
    );
  });

  it('labels clips in the sans family from a vendored font file', () => {
    expect(THEME).toMatch(/^FONT_FAMILY = "IBM Plex Sans"$/m);
    const file = THEME.match(/^FONT_FILE = "([^"]+)"$/m)?.[1];
    expect(file).toBeDefined();
    expect(existsSync(join(MOTION, file ?? ''))).toBe(true);
  });

  it('carries the stage type scale and minimum stage width of the tokens', () => {
    const scale = loadTokens().type.stageScale;
    expect(THEME).toMatch(
      new RegExp(`^CLIP_STAGE_PX = ${scale.fullSizeMinStagePx}$`, 'm'),
    );
    expect(THEME).toContain(`    'label': ${scale.labelPx},`);
    expect(THEME).toContain(`    'axis': ${scale.axisPx},`);
    expect(THEME).toContain(`    'tick': ${scale.tickPx},`);
  });

  it.each(CLIP_SOURCES)('$name sets no colour, font or size itself', ({ code }) => {
    expect(code).not.toMatch(/#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/);
    expect(code).not.toMatch(/\b(?:font|font_size|color|fill_color|stroke_color|stroke_width)\s*=/);
    expect(code).not.toMatch(/\b(?:WHITE|BLACK|GRAY|GREY|BLUE|YELLOW|RED|GREEN|ORANGE|TEAL|GOLD|PURPLE|PINK)(?:_[A-E])?\b/);
    expect(code).not.toMatch(/\b(?:Tex|MathTex|Text|MarkupText|Paragraph)\(/);
  });
});
