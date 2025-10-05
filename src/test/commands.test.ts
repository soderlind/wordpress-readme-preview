import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Sanity test: ensure contributed commands list matches expected set and removed diff command is absent.
 */
describe('contributed commands', () => {
  const pkgPath = path.join(__dirname, '../../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  it('includes only expected command IDs', () => {
    const contributed = (pkg.contributes?.commands || []).map((c: any) => c.command).sort();
    const expected = [
      'wordpress-readme.showPreview',
      'wordpress-readme.showPreviewToSide',
      'wordpress-readme.validateReadme',
      'wordpress-readme.autoFixMarkdown'
    ].sort();
    expect(contributed).toEqual(expected);
  });

  it('does not include deprecated diff preview command', () => {
    const contributed = (pkg.contributes?.commands || []).map((c: any) => c.command);
    expect(contributed).not.toContain('wordpress-readme.previewAutoFixDiff');
  });
});
