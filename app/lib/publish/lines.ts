/** Character offset where `line` (1-based) starts, skipping its indentation. Clamped to the code. */
export function offsetOfLine(code: string, line: number): number {
  let offset = 0;
  for (let l = 1; l < line; l++) {
    const next = code.indexOf("\n", offset);
    if (next === -1) return code.length;
    offset = next + 1;
  }
  while (offset < code.length && (code[offset] === " " || code[offset] === "\t")) offset++;
  return offset;
}
