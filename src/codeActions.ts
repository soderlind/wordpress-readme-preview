import * as vscode from 'vscode';

interface FixMeta {
  title: string;
  apply: (editor: vscode.TextEditor, range: vscode.Range, diagnostic: vscode.Diagnostic) => Promise<void> | void;
}

// Map simple heuristic diagnostic messages to fixers
const FIXERS: { matcher: RegExp; build: (diagnostic: vscode.Diagnostic) => FixMeta | undefined }[] = [
  {
    matcher: /Malformed readme heading syntax/i,
    build: (d) => {
      // Diagnostic.code currently contains the full suggestion sentence like:
      //   Use proper heading format, e.g. "== Description =="
      // We only want the quoted normalized heading, not the explanatory text.
      const raw = (d as any).suggestion || d.code;
      if (!raw) return undefined;
      let replacement = String(raw).trim();
      // Extract last quoted substring if present
      const quoted = replacement.match(/"([^"\r\n]+)"(?=[^"']*$)/);
      if (quoted) {
        replacement = quoted[1];
      } else {
        // Fallback heuristics: if sentence starts with 'Use proper heading format'
        if (/^Use proper heading format/i.test(replacement)) {
          const possible = replacement.split(/e\.g\./i)[1];
          if (possible) {
            const m2 = possible.match(/"([^"\r\n]+)"/);
            if (m2) replacement = m2[1];
          }
        }
      }
      // Final safeguard: ensure it resembles a == Heading == or = Heading = pattern
      if (!/^(==|=)\s+.+?\s+(==|=)$/.test(replacement)) {
        return undefined; // don't offer a broken fix
      }
      return {
        title: 'Fix malformed heading',
        apply: async (editor, range) => {
          await editor.edit(edit => edit.replace(range, replacement));
        }
      };
    }
  },
  {
    matcher: /Hash \(#\) style headings/i,
    build: (d) => ({
      title: 'Convert to == heading ==',
      apply: async (editor, range) => {
        const raw = editor.document.getText(range);
        const m = raw.match(/^(#{1,6})(.*)$/);
        if (!m) return;
        const level = m[1].length;
        let titlePortion = m[2].replace(/^\s*/, '');
        if (!titlePortion) return;
        // Remove trailing stray hashes preceded by space
        titlePortion = titlePortion.replace(/\s+#{1,6}\s*$/, '').trim();
        titlePortion = titlePortion.replace(/\s{2,}/g, ' ');
        if (!titlePortion) return;
        const replacement = (level <= 2) ? `== ${titlePortion} ==` : `= ${titlePortion} =`;
        await editor.edit(edit => edit.replace(range, replacement));
      }
    })
  },
  {
    matcher: /Unclosed fenced code block/i,
    build: () => ({
      title: 'Close code fence here',
      apply: async (editor, range) => {
        const doc = editor.document;
        // Avoid inserting if a closing fence already exists on next non-empty line
        const lineCount = doc.lineCount;
        let line = range.end.line;
        let alreadyClosed = false;
        for (let i = line; i < Math.min(line + 5, lineCount); i++) {
          const txt = doc.lineAt(i).text.trim();
            if (txt === '```') { alreadyClosed = true; break; }
          if (txt.length > 0) {
            // first non-empty line that's not a fence: stop scanning
            break;
          }
        }
        if (alreadyClosed) { return; }
        const insertPos = range.end;
        await editor.edit(edit => edit.insert(insertPos, '\n```'));
      }
    })
  },
  {
    matcher: /Unbalanced bold markers/i,
    build: () => ({
      title: 'Add closing **',
      apply: async (editor, range) => {
        const docText = editor.document.getText(range);
        // Only add if text has odd number of ** occurrences
        const count = (docText.match(/\*\*/g) || []).length;
        if (count % 2 === 1) {
          await editor.edit(edit => edit.insert(range.end, '**'));
        }
      }
    })
  },
  {
    matcher: /Unbalanced italic markers/i,
    build: () => ({
      title: 'Add closing *',
      apply: async (editor, range) => {
        const docText = editor.document.getText(range).replace(/\*\*/g, ''); // ignore bold pairs
        const singleCount = (docText.match(/\*/g) || []).length;
        if (singleCount % 2 === 1) {
          await editor.edit(edit => edit.insert(range.end, '*'));
        }
      }
    })
  },
  {
    matcher: /Possible unclosed markdown link/i,
    build: () => ({
      title: 'Add closing )',
      apply: async (editor, range) => {
        const docText = editor.document.getText(range);
        // If there's already a closing paren later on same line in doc, skip
        if (/\)[^\n]*$/.test(docText)) { return; }
        if (!docText.trim().endsWith(')')) {
          await editor.edit(edit => edit.insert(range.end, ')'));
        }
      }
    })
  }
];

export class ReadmeCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] | undefined {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      // Use the diagnostic's own range (may be whole line or partial)
      const targetRange = diagnostic.range;
      for (const f of FIXERS) {
        if (f.matcher.test(diagnostic.message)) {
          const meta = f.build(diagnostic);
          if (!meta) { continue; }
          const action = new vscode.CodeAction(meta.title, vscode.CodeActionKind.QuickFix);
          action.diagnostics = [diagnostic];
          action.command = {
            title: meta.title,
            command: 'wordpress-readme.applyQuickFix',
            arguments: [document.uri, targetRange, diagnostic, meta]
          };
          actions.push(action);
        }
      }
    }

    return actions;
  }
}

export function registerQuickFixSupport(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('readme-txt', new ReadmeCodeActionProvider(), {
      providedCodeActionKinds: ReadmeCodeActionProvider.providedCodeActionKinds
    }),
    vscode.commands.registerCommand('wordpress-readme.applyQuickFix', async (
      uri: vscode.Uri,
      range: vscode.Range,
      diagnostic: vscode.Diagnostic,
      meta: FixMeta
    ) => {
      const editor = await vscode.window.showTextDocument(uri);
      await meta.apply(editor, range, diagnostic);
    })
  );
}
