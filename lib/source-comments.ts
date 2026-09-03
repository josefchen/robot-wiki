/**
 * Comments are stripped before any assignment is read, so an example inside
 * a doc comment cannot register as a writer. The scan is quote-aware because
 * `//` occurs inside ordinary URLs and class strings.
 */
export function stripComments(text: string): string {
  let output = '';
  let index = 0;
  const stack: Array<'"' | "'" | '`' | '${'> = [];
  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];
    const top = stack.at(-1);
    if (top === '"' || top === "'" || top === '`') {
      if (char === '\\') {
        output += text.slice(index, index + 2);
        index += 2;
        continue;
      }
      if (char === top) stack.pop();
      else if (top === '`' && char === '$' && next === '{') {
        stack.push('${');
        output += '${';
        index += 2;
        continue;
      }
      output += char;
      index += 1;
      continue;
    }
    if (char === '/' && next === '/') {
      while (index < text.length && text[index] !== '\n') index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      index += 2;
      while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
        // Newlines are preserved so reported line numbers stay usable.
        if (text[index] === '\n') output += '\n';
        index += 1;
      }
      index += 2;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') stack.push(char);
    else if (char === '}' && top === '${') stack.pop();
    output += char;
    index += 1;
  }
  return output;
}
