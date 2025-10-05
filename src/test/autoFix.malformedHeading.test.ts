import { describe, it, expect } from 'vitest';
import { autoFixReadme } from '../autoFix';

/**
 * Reproduces issue: malformed heading like '== Description =' results in duplicate proper heading
 * rather than normalizing the existing line.
 */
describe('autoFixReadme malformed heading handling', () => {
  it('should normalize a malformed double-equals heading instead of duplicating', () => {
    const input = [
      '=== Plugin Name ===',
      '',
      '== Description =', // missing trailing '='
      'Some text here',
      ''
    ].join('\n');

    const { updated, changes } = autoFixReadme(input);

    // Expect only one corrected Description header line and no leftover malformed one
    const lines = updated.split(/\n/);
    const descriptionHeaders = lines.filter(l => /^==\s+Description\s+==$/.test(l));

    expect(descriptionHeaders.length).toBe(1);
    expect(updated).not.toMatch(/== Description =$/m);
  });
});
