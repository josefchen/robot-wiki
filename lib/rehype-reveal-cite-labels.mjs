/**
 * rehype plugin: give each cited answer option of <SelfCheck> and
 * <PredictThenReveal> the label its citation chip shows.
 *
 * Authors write `cite: 'dagger-2011'` in an option. The commit-to-reveal
 * primitive is a client module that does not load the citation registry, so
 * the registry label is written into the compiled option as `citeLabel`
 * here, the same author-year label the inline <Cite> chips print. Only the
 * compiled expression changes: the components stay registered as the
 * primitive's own exports, so what the brand-v2 census reads of
 * mdx-components.tsx is unchanged. An option that already states a
 * citeLabel keeps it, and an id missing from the registry fails the build.
 *
 * Options: `{ labels: { [citationId]: label } }`, passed from next.config.ts
 * so the compiled articles change when a label does.
 * Plain ESM with no dependencies, like the other local rehype plugins.
 */

const COMPONENTS = new Set(['SelfCheck', 'PredictThenReveal']);

function keyName(property) {
  if (property.type !== 'Property' || property.computed) return null;
  if (property.key.type === 'Identifier') return property.key.name;
  return property.key.type === 'Literal' && typeof property.key.value === 'string'
    ? property.key.value
    : null;
}

function labelOption(option, labels, file) {
  if (option?.type !== 'ObjectExpression') return;
  const cite = option.properties.find((property) => keyName(property) === 'cite');
  if (cite?.value.type !== 'Literal' || typeof cite.value.value !== 'string') return;
  if (option.properties.some((property) => keyName(property) === 'citeLabel')) return;
  const label = labels[cite.value.value];
  if (typeof label !== 'string') {
    throw new Error(
      `${file?.path ?? 'MDX'}: an answer option cites "${cite.value.value}", which the citation registry lacks`,
    );
  }
  option.properties.push({
    type: 'Property',
    key: { type: 'Identifier', name: 'citeLabel' },
    value: { type: 'Literal', value: label, raw: JSON.stringify(label) },
    kind: 'init',
    method: false,
    shorthand: false,
    computed: false,
  });
}

function visit(node, labels, file) {
  if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && COMPONENTS.has(node.name)) {
    for (const attribute of node.attributes ?? []) {
      if (attribute.type !== 'mdxJsxAttribute' || attribute.name !== 'options') continue;
      // The compiler builds the prop from this estree, not from the source text.
      const statement = attribute.value?.data?.estree?.body?.[0];
      if (statement?.type !== 'ExpressionStatement' || statement.expression.type !== 'ArrayExpression') continue;
      for (const option of statement.expression.elements) labelOption(option, labels, file);
    }
  }
  for (const child of node.children ?? []) visit(child, labels, file);
}

export default function rehypeRevealCiteLabels(options = {}) {
  const labels = options.labels ?? {};
  return (tree, file) => {
    visit(tree, labels, file);
  };
}
