import ts from 'typescript6';
import { citationSchema } from '../data/schemas/citation.ts';
import type { Citation } from '../data/schemas/citation.ts';

/** Read registry data without evaluating its module or helper functions. */
export function readCitationRegistrySource(text: string): Citation[] {
  const source = ts.createSourceFile('citations.ts', text, ts.ScriptTarget.Latest, true);
  const declarations: ts.VariableDeclaration[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'CITATIONS') declarations.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (declarations.length !== 1 || !declarations[0].initializer) throw new Error('citation registry needs one literal declaration');
  const literal = (node: ts.Expression): unknown => {
    if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) return literal(node.expression);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (ts.isArrayLiteralExpression(node)) return node.elements.map((item) => literal(item));
    if (ts.isObjectLiteralExpression(node)) {
      const result: Record<string, unknown> = {};
      for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) throw new Error('nonliteral citation property');
        const name = property.name.text;
        if (Object.hasOwn(result, name)) throw new Error(`duplicate citation property ${name}`);
        result[name] = literal(property.initializer);
      }
      return result;
    }
    throw new Error('nonliteral citation value');
  };
  const values = literal(declarations[0].initializer);
  if (!Array.isArray(values) || !values.length) throw new Error('empty citation registry');
  const entries = values.map((value) => citationSchema.parse(value));
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length) throw new Error('duplicate citation id');
  return entries;
}
