import { describe, it, expect } from 'vitest';
import { autoFixReadme } from '../autoFix';

/**
 * Tests for hash heading normalization. We expect:
 *  - '# Title' and '## Title' -> '== Title ==' (level 1-2 => section)
 *  - '### Title' or deeper -> '= Title =' (sub heading)
 *  - Headings missing the space after hashes (e.g. '##Title') also normalized
 *  - Multiple spaces trimmed: '#   Title  ' -> '== Title =='
 *  - Trailing stray '#' removed: '# Title #' -> '== Title =='
 */

describe('autoFixReadme hash heading normalization', () => {
  function runSingle(inputLine: string) {
    const input = `=== Plugin ===\n\n${inputLine}\nBody`; // include plugin header to avoid malformed detection noise
    const { updated } = autoFixReadme(input);
    const lines = updated.split(/\n/);
    return lines[2];
  }

  it('converts # Title to == Title ==', () => {
    expect(runSingle('# Title')).toBe('== Title ==');
  });

  it('converts ## Title to == Title ==', () => {
    expect(runSingle('## Title')).toBe('== Title ==');
  });

  it('converts ### Title to = Title =', () => {
    expect(runSingle('### Title')).toBe('= Title =');
  });

  it('converts ###### Title to = Title =', () => {
    expect(runSingle('###### Title')).toBe('= Title =');
  });

  it('handles missing space after hashes', () => {
    expect(runSingle('##Title')).toBe('== Title ==');
  });

  it('trims excessive internal spaces', () => {
    expect(runSingle('#   Title   ')).toBe('== Title ==');
  });

  it('removes trailing stray #', () => {
    expect(runSingle('# Title #')).toBe('== Title ==');
  });
});
