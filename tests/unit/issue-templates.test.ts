import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { DOMAINS } from '@/data/domains';
import pkg from '@/package.json';

// The issue forms and the pull request template are the intake contract for
// this repo: they are what makes a report actionable without a round trip.
// GitHub parses them silently, so a typo does not fail anything visible and
// the form just stops appearing. These tests parse the shipped YAML the way
// GitHub does and hold it to the same rules the docs state: real element
// types, a required evidence field on every path, dropdown options that stay
// in step with data/domains.ts, and only repo paths and npm scripts that
// actually exist.
// process.cwd() is the repo root, matching tests/unit/repo-docs.test.ts.
const TEMPLATE_DIR = '.github/ISSUE_TEMPLATE';
const repoPath = (rel: string): string => join(process.cwd(), rel);
const read = (rel: string): string => readFileSync(repoPath(rel), 'utf8');

const scripts = pkg.scripts as Record<string, string>;

type FormFieldAttributes = {
  label?: unknown;
  value?: unknown;
  description?: unknown;
  render?: unknown;
  options?: unknown;
};

type FormField = {
  type?: unknown;
  id?: unknown;
  attributes?: FormFieldAttributes;
  validations?: { required?: unknown };
};

type IssueForm = {
  name?: unknown;
  description?: unknown;
  title?: unknown;
  labels?: unknown;
  body?: unknown;
};

type LoadedForm = {
  file: string;
  raw: string;
  form: IssueForm | null;
  parseError: string | null;
};

/** Element types GitHub accepts in an issue form body. */
const ELEMENT_TYPES = new Set(['markdown', 'input', 'textarea', 'dropdown', 'checkboxes']);

const templateFiles = existsSync(repoPath(TEMPLATE_DIR))
  ? readdirSync(repoPath(TEMPLATE_DIR))
      .filter((file) => /\.ya?ml$/.test(file) && !/^config\.ya?ml$/.test(file))
      .sort()
  : [];

// Parsed at module scope so every test sees the same forms; a parse failure is
// captured per file instead of thrown, so one broken form reports as itself.
const forms: LoadedForm[] = templateFiles.map((file) => {
  const raw = read(`${TEMPLATE_DIR}/${file}`);
  try {
    return { file, raw, form: parseYaml(raw) as IssueForm, parseError: null };
  } catch (error) {
    return { file, raw, form: null, parseError: String(error) };
  }
});

function bodyFields(form: IssueForm | null): FormField[] {
  if (!Array.isArray(form?.body)) return [];
  return form.body.filter(
    (field): field is FormField => typeof field === 'object' && field !== null,
  );
}

function label(field: FormField): string {
  return typeof field.attributes?.label === 'string' ? field.attributes.label : '';
}

function isRequired(field: FormField): boolean {
  return field.validations?.required === true;
}

/** Dropdown options (plain strings). */
function dropdownOptions(field: FormField | undefined): string[] {
  const options = field?.attributes?.options;
  if (!Array.isArray(options)) return [];
  return options.filter((option): option is string => typeof option === 'string');
}

/** Checkbox options ({ label, required? } objects). */
function checkboxOptions(field: FormField | undefined): Array<{ label?: unknown }> {
  const options = field?.attributes?.options;
  if (!Array.isArray(options)) return [];
  return options.filter(
    (option): option is { label?: unknown } => typeof option === 'object' && option !== null,
  );
}

/** The single form whose name matches, failing loudly when it is missing. */
function formMatching(pattern: RegExp): LoadedForm {
  const matches = forms.filter((loaded) => pattern.test(String(loaded.form?.name ?? '')));
  expect(matches.map((m) => m.file), `exactly one form should match ${pattern}`).toHaveLength(1);
  return matches[0];
}

/** Every template file's text, including config.yml and the PR template. */
function allTemplateText(): string {
  const extras = [`${TEMPLATE_DIR}/config.yml`, '.github/PULL_REQUEST_TEMPLATE.md'].filter((rel) =>
    existsSync(repoPath(rel)),
  );
  return [...forms.map((loaded) => loaded.raw), ...extras.map(read)].join('\n');
}

describe('issue forms exist for every contribution path', () => {
  it('ships a structured form directory, not just blank issues', () => {
    expect(existsSync(repoPath(TEMPLATE_DIR)), `${TEMPLATE_DIR} must exist`).toBe(true);
    expect(templateFiles.length).toBeGreaterThanOrEqual(4);
  });

  it('covers corrections, bugs, new coverage, data, and tooling', () => {
    const names = forms.map((loaded) => String(loaded.form?.name ?? ''));
    const paths: Array<[string, RegExp]> = [
      ['a factual correction to published content', /^content correction/i],
      ['a bug in the site or an interactive', /^bug/i],
      ['a new or expanded article', /^new (article|coverage)/i],
      ['a fix to a structured data registry', /^data correction/i],
      ['a build, tooling, or setup failure', /^(build|tooling)/i],
    ];
    for (const [path, pattern] of paths) {
      expect(
        names.some((name) => pattern.test(name)),
        `no issue form handles ${path} (form names: ${names.join(', ')})`,
      ).toBe(true);
    }
  });
});

describe('issue forms parse and follow the GitHub form schema', () => {
  it('is valid YAML in every file', () => {
    expect(forms.filter((loaded) => loaded.parseError !== null).map((loaded) => loaded.file)).toEqual(
      [],
    );
  });

  it('declares a name, description, labels, and a body on every form', () => {
    for (const { file, form } of forms) {
      expect(typeof form?.name, `${file} needs a name`).toBe('string');
      expect(String(form?.name ?? '').length, `${file} needs a name`).toBeGreaterThan(0);
      // The description is what a reporter reads when choosing between forms.
      expect(String(form?.description ?? '').length, `${file} needs a description`).toBeGreaterThan(
        20,
      );
      expect(Array.isArray(form?.labels), `${file} needs a labels array`).toBe(true);
      expect(bodyFields(form).length, `${file} needs body fields`).toBeGreaterThan(3);
    }
  });

  it('uses only real element types, each with a label and a unique id', () => {
    for (const { file, form } of forms) {
      const ids: string[] = [];
      for (const field of bodyFields(form)) {
        const type = String(field.type ?? '');
        expect(ELEMENT_TYPES.has(type), `${file}: unknown element type "${type}"`).toBe(true);
        if (type === 'markdown') {
          // Markdown blocks carry prose, never an id or a label.
          expect(
            String(field.attributes?.value ?? '').length,
            `${file}: markdown block needs attributes.value`,
          ).toBeGreaterThan(0);
          continue;
        }
        const id = String(field.id ?? '');
        expect(id, `${file}: ${type} field needs an id`).toMatch(/^[a-z][a-z0-9-]*$/);
        expect(label(field).length, `${file}: field "${id}" needs a label`).toBeGreaterThan(0);
        ids.push(id);
      }
      expect(new Set(ids).size, `${file}: duplicate field ids`).toBe(ids.length);
    }
  });

  it('gives dropdowns at least two options and checkbox groups at least one', () => {
    for (const { file, form } of forms) {
      for (const field of bodyFields(form)) {
        const id = String(field.id ?? '');
        if (field.type === 'dropdown') {
          const options = dropdownOptions(field);
          expect(
            options.length,
            `${file}: dropdown "${id}" needs at least two string options`,
          ).toBeGreaterThanOrEqual(2);
          expect(
            options.filter((option) => option.trim().length === 0),
            `${file}: dropdown "${id}" has an empty option`,
          ).toEqual([]);
        }
        if (field.type === 'checkboxes') {
          const options = checkboxOptions(field);
          expect(options.length, `${file}: checkboxes "${id}" needs options`).toBeGreaterThan(0);
          for (const option of options) {
            expect(
              String(option.label ?? '').length,
              `${file}: a checkbox in "${id}" has no label`,
            ).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('requires the fields a triager cannot work without', () => {
    for (const { file, form } of forms) {
      const required = bodyFields(form).filter(isRequired);
      expect(required.length, `${file} marks too few fields required`).toBeGreaterThanOrEqual(3);
    }
  });

  it('prefills a conventional-commit title prefix', () => {
    // CONTRIBUTING requires feat:/fix:/chore:/docs: prefixes, and the issue
    // title is what the eventual branch and PR title get built from.
    for (const { file, form } of forms) {
      expect(String(form?.title ?? ''), `${file} needs a conventional title prefix`).toMatch(
        /^(feat|fix|chore|docs)(\([a-z-]+\))?: $/,
      );
    }
  });

  it('labels every form with lowercase kebab-case labels', () => {
    for (const { file, form } of forms) {
      const labels = Array.isArray(form?.labels) ? form.labels : [];
      expect(labels.length, `${file} needs at least one label`).toBeGreaterThan(0);
      for (const value of labels) {
        expect(String(value), `${file}: label "${String(value)}"`).toMatch(/^[a-z][a-z0-9-]*$/);
      }
    }
  });
});

describe('issue forms ask for the evidence this repo reviews against', () => {
  it('requires an evidence field on every form', () => {
    // No form may be satisfiable with prose alone: either a source, a
    // reproduction, or verbatim command output has to come with it.
    for (const { file, form } of forms) {
      const evidence = bodyFields(form)
        .filter(isRequired)
        .filter((field) => /source|reproduce|output|says|happened|command|fields/i.test(label(field)));
      expect(
        evidence.map((field) => label(field)).length,
        `${file} must require at least one evidence field`,
      ).toBeGreaterThan(0);
    }
  });

  it('requires primary sources on the content, coverage, and data forms', () => {
    for (const pattern of [/^content correction/i, /^new (article|coverage)/i, /^data correction/i]) {
      const { file, form } = formMatching(pattern);
      const sources = bodyFields(form).find((field) => /source/i.test(label(field)));
      expect(sources, `${file} must ask for sources`).toBeDefined();
      expect(isRequired(sources ?? {}), `${file}: the sources field must be required`).toBe(true);
    }
  });

  it('states the no-invented-data rule where a reporter would guess a value', () => {
    for (const pattern of [/^content correction/i, /^data correction/i]) {
      const { file, raw } = formMatching(pattern);
      expect(raw, `${file} must explain the "not disclosed" convention`).toMatch(/not disclosed/i);
    }
  });

  it('asks a bug reporter for a URL, a reproduction, and an environment', () => {
    const { file, form } = formMatching(/^bug/i);
    const fields = bodyFields(form);
    for (const pattern of [/url/i, /reproduce/i, /browser|os|device/i]) {
      const field = fields.find((candidate) => pattern.test(label(candidate)));
      expect(field, `${file} must ask for ${pattern}`).toBeDefined();
      expect(isRequired(field ?? {}), `${file}: ${pattern} must be required`).toBe(true);
    }
  });

  it('collects tooling failures as verbatim shell output', () => {
    const { file, form } = formMatching(/^(build|tooling)/i);
    const shellFields = bodyFields(form).filter(
      (field) => field.type === 'textarea' && field.attributes?.render === 'shell',
    );
    expect(
      shellFields.length,
      `${file} should render the command and its output as shell blocks`,
    ).toBeGreaterThanOrEqual(2);
    expect(shellFields.every(isRequired), `${file}: shell fields must be required`).toBe(true);
  });
});

describe('issue forms stay in step with the repo', () => {
  it('offers exactly the domains defined in data/domains.ts', () => {
    const { file, form } = formMatching(/^new (article|coverage)/i);
    const domain = bodyFields(form).find((field) => field.id === 'domain');
    expect(domain, `${file} must offer a domain dropdown`).toBeDefined();
    // Options read "<domain-key> (Human readable name)".
    const keys = dropdownOptions(domain).map((option) => option.split(' ')[0]);
    expect(keys, `${file}: one domain option per domain`).toHaveLength(DOMAINS.length);
    expect(new Set(keys)).toEqual(new Set<string>(DOMAINS));
  });

  it('points only at repo paths that exist', () => {
    const referenced = [
      ...new Set(
        [
          ...allTemplateText().matchAll(
            /\b(?:app|components|content|data|lib|scripts|tests|research)\/[A-Za-z0-9._/-]+\.(?:ts|tsx|mdx|json|mjs)\b/g,
          ),
        ].map((match) => match[0]),
      ),
    ];
    expect(referenced.length, 'templates should point contributors at real files').toBeGreaterThan(
      3,
    );
    expect(referenced.filter((path) => !existsSync(repoPath(path)))).toEqual([]);
  });

  it('names only npm scripts that exist', () => {
    const named = [
      ...new Set(
        [...allTemplateText().matchAll(/npm run ([a-z][a-z0-9:.-]*)/g)].map((match) => match[1]),
      ),
    ];
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((name) => !(name in scripts))).toEqual([]);
  });
});

describe('ISSUE_TEMPLATE/config.yml', () => {
  const rel = `${TEMPLATE_DIR}/config.yml`;

  it('exists and parses', () => {
    expect(existsSync(repoPath(rel)), `${rel} must exist`).toBe(true);
    expect(() => parseYaml(read(rel))).not.toThrow();
  });

  it('declares blank issues explicitly and offers contact links', () => {
    const config = parseYaml(read(rel)) as {
      blank_issues_enabled?: unknown;
      contact_links?: unknown;
    };
    expect(typeof config.blank_issues_enabled).toBe('boolean');
    const links = Array.isArray(config.contact_links) ? config.contact_links : [];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links as Array<Record<string, unknown>>) {
      expect(String(link.name ?? '').length).toBeGreaterThan(0);
      expect(String(link.about ?? '').length).toBeGreaterThan(20);
      expect(String(link.url ?? '')).toMatch(/^https:\/\//);
    }
  });

  it('links to repo files that exist', () => {
    const raw = read(rel);
    const blobPaths = [...raw.matchAll(/blob\/main\/([A-Za-z0-9._/-]+)/g)].map((match) => match[1]);
    expect(blobPaths.length).toBeGreaterThan(0);
    expect(blobPaths.filter((path) => !existsSync(repoPath(path)))).toEqual([]);
  });
});

describe('PULL_REQUEST_TEMPLATE.md', () => {
  const rel = '.github/PULL_REQUEST_TEMPLATE.md';

  it('exists with a real checklist', () => {
    expect(existsSync(repoPath(rel)), `${rel} must exist`).toBe(true);
    const template = read(rel);
    expect(template.length).toBeGreaterThan(800);
    expect([...template.matchAll(/^- \[ \] /gm)].length).toBeGreaterThanOrEqual(8);
  });

  it('requires every gate CONTRIBUTING calls non-negotiable', () => {
    const template = read(rel);
    const named = new Set(
      [...template.matchAll(/npm run ([a-z][a-z0-9:.-]*)/g)].map((match) => match[1]),
    );
    for (const script of ['typecheck', 'lint', 'test', 'validate:content', 'build', 'test:e2e']) {
      expect(named.has(script), `${rel} must require npm run ${script}`).toBe(true);
    }
  });

  it('carries the content rules a reviewer audits against', () => {
    const template = read(rel);
    expect(template).toMatch(/data\/citations\.ts/);
    expect(template).toMatch(/not disclosed/i);
    expect(template).toMatch(/prefers-reduced-motion/);
  });
});
