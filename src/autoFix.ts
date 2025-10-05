// Note: use a type-only import so unit tests of autoFixReadme don't require the VS Code runtime module.
import type * as vscode from 'vscode';

/**
 * Auto-fix routine converting generic Markdown to WordPress readme style.
 * - Convert fenced code blocks (``` or ```lang) to inline or indented style
 *   * Single-line fenced blocks -> `inline`
 *   * Multi-line -> indented with four spaces
 * - Convert hash headings (#, ##, ###) to == / = style heuristically
 * - Normalize excessive blank lines (max 2)
 */
export function autoFixReadme(raw: string, options?: { multiLineStyle?: 'indented' | 'fenced' }): { updated: string; changes: string[] } {
  const changes: string[] = [];
  const lines = raw.split(/\r?\n/);
  const output: string[] = [];
  const style = options?.multiLineStyle || 'indented';

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Normalize malformed WordPress heading styles first (e.g. '== Title =' or '= Title' or '==Title ==')
    const eqHeadingLike = line.trim().startsWith('=');
    if (eqHeadingLike) {
      const trimmed = line.trim();
      // Capture sequences of '=' surrounding some text, allowing malformed spacing/unequal counts
      // We accept patterns with 1-3 leading '=' and 1-3 trailing '=' but not the main plugin header (3 on both ends)
      const malformedMatch = trimmed.match(/^(=+)(.+?)(=+)$/);
      if (malformedMatch) {
        const leading = malformedMatch[1];
        const innerRaw = malformedMatch[2].trim();
        const trailing = malformedMatch[3];
        const isMainHeaderCandidate = leading.length === 3 && trailing.length === 3;
        if (!isMainHeaderCandidate) {
          // Decide if section (==) or sub (single =) based on leading or trailing counts >=2
            const isSection = leading.length >= 2 || trailing.length >= 2;
            const normalized = isSection ? `== ${innerRaw} ==` : `= ${innerRaw} =`;
          if (normalized !== line) {
            output.push(normalized);
            changes.push(`Normalized malformed heading at line ${i + 1}`);
            i++;
            continue;
          }
        }
      } else if (/^=+\s+.+$/.test(trimmed) && !/^=+\s+.+\s+=+$/.test(trimmed)) {
        // Case: '= Title' missing trailing '=' group
        const inner = trimmed.replace(/^=+\s+/, '').trim();
        const normalized = trimmed.startsWith('==') ? `== ${inner} ==` : `= ${inner} =`;
        output.push(normalized);
        changes.push(`Added missing trailing equals to heading at line ${i + 1}`);
        i++;
        continue;
      }
    }
    const fenceMatch = line.match(/^```(\w+)?\s*$/);
    if (fenceMatch) {
      // collect fence block
      const startIndex = i;
      let language = fenceMatch[1];
      const block: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        block.push(lines[i]);
        i++;
      }
      let closed = false;
      if (i < lines.length && /^```\s*$/.test(lines[i])) {
        closed = true;
        i++; // skip closing fence
      }

      if (block.length === 0) {
        // empty fence -> drop
        changes.push(`Removed empty fenced block at line ${startIndex + 1}`);
      } else if (block.length === 1) {
        // single line -> inline code
        const content = block[0].trim();
        const inline = '`' + content.replace(/`/g, '\\`') + '`';
        output.push(inline);
        changes.push(`Converted single-line fenced block at line ${startIndex + 1} to inline code`);
      } else {
        // multi-line handling based on style
        if (style === 'fenced') {
          // Re-emit fenced block (normalize language hint retention rule: keep original language)
          output.push('```' + (language ? language : ''));
          // Normalize indentation inside block (convert tabs to 4 spaces, unify mix)
          const normBlock = normalizeBlockIndent(block, changes, startIndex + 1);
          normBlock.forEach(l => output.push(l));
          output.push('```');
          changes.push(`Normalized multi-line fenced block (${block.length} lines) at line ${startIndex + 1}`);
        } else {
          if (language) {
            changes.push(`Removed language hint (${language}) from fenced block at line ${startIndex + 1}`);
          }
            const normBlock = normalizeBlockIndent(block, changes, startIndex + 1);
            normBlock.forEach(b => output.push('    ' + b.replace(/^\s+/, '')));
          changes.push(`Converted multi-line fenced block (${block.length} lines) starting at line ${startIndex + 1} to indented code block`);
        }
      }
      continue; // proceed without i++ because we've advanced
    }

    // Hash heading conversion (accept missing space variants like '##Title')
    const hashHeading = line.match(/^(#{1,6})(.*)$/);
    if (hashHeading) {
      const level = hashHeading[1].length;
      let titlePortion = hashHeading[2];
      // If there is no space after hashes but alphanumeric text, treat as heading
      // Normalize leading spaces then collapse internal multiple spaces
      titlePortion = titlePortion.replace(/^\s*/, '');
      // If nothing remains, not a valid heading—fall through
      if (titlePortion.length > 0) {
        // Trim trailing stray hashes: patterns like 'Title #', 'Title ##'
        // Only remove if there is at least one space before trailing hashes, to avoid eating 'C#' or similar mid-word
        let cleaned = titlePortion.replace(/\s+#{1,6}\s*$/,'').trim();
        // Collapse multiple internal spaces
        cleaned = cleaned.replace(/\s{2,}/g, ' ');
        if (cleaned.length > 0) {
          const converted = (level <= 2) ? `== ${cleaned} ==` : `= ${cleaned} =`;
          if (converted !== line) {
            output.push(converted);
            changes.push(`Converted hash heading (level ${level}) to readme heading at line ${i + 1}`);
          } else {
            output.push(line);
          }
          i++;
          continue;
        }
      }
    }

    output.push(line);
    i++;
  }

  // Normalize blank lines (no more than 2 consecutive)
  const normalized: string[] = [];
  let blankCount = 0;
  for (const l of output) {
    if (l.trim() === '') {
      blankCount++;
      if (blankCount <= 2) normalized.push('');
      else if (blankCount === 3) changes.push('Collapsed excessive blank lines');
    } else {
      blankCount = 0;
      normalized.push(l);
    }
  }

  const updated = normalized.join('\n');
  return { updated, changes };
}

// Normalize indentation inside a code block; detect mixed tabs/spaces and unify to spaces
function normalizeBlockIndent(block: string[], changes: string[], startLine: number): string[] {
  let hasTab = false;
  let hasSpace = false;
  block.forEach(l => {
    if (/^\t+/.test(l)) hasTab = true;
    if (/^ +/.test(l)) hasSpace = true;
  });
  if (hasTab && hasSpace) {
    changes.push(`Normalized mixed indentation in code block starting line ${startLine}`);
  }
  return block.map(l => l.replace(/^\t/g, '    '));
}

let _vscode: typeof import('vscode') | undefined;
async function getVscode(): Promise<typeof import('vscode') | undefined> {
  if (_vscode) return _vscode;
  try {
    // Dynamic import so tests (node env) don't fail when 'vscode' module isn't present.
    _vscode = await import('vscode');
    return _vscode;
  } catch {
    return undefined;
  }
}

export async function runAutoFix(editor?: vscode.TextEditor) {
  const vscodeApi = await getVscode();
  if (!vscodeApi) { return; } // silently no-op in non-extension test environment
  if (!editor) {
    editor = vscodeApi.window.activeTextEditor ?? undefined;
  }
  if (!editor) { return; }
  const doc = editor.document;
  const original = doc.getText();
  const { updated, changes } = autoFixReadme(original);
  if (updated === original) {
    void vscodeApi.window.showInformationMessage('No auto-fix changes necessary.');
    return;
  }
  const fullRange = new vscodeApi.Range(0, 0, doc.lineCount, 0);
  await editor.edit(editBuilder => {
    editBuilder.replace(fullRange, updated);
  });
  if (changes.length) {
    void vscodeApi.window.showInformationMessage(`Auto-fix applied: ${changes.length} changes`);
  }
}
