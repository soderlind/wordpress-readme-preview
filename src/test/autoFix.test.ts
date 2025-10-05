import { describe, it, expect } from 'vitest';
import { autoFixReadme } from '../autoFix';

describe('autoFixReadme', () => {
  it('converts single-line fenced block to inline code', () => {
    const input = '=== Plugin Name ===\n\n== Description ==\n```\ncode();\n```';
    const { updated, changes } = autoFixReadme(input);
    expect(updated).toContain('`code();`');
    expect(changes.some(c => /single-line fenced block/.test(c))).toBe(true);
  });

  it('indents multi-line fenced block when style indented', () => {
    const input = [
      '=== Plugin Name ===',
      '',
      '== Description ==',
      '```',
      'line1',
      'line2',
      '```'
    ].join('\n');
    const { updated, changes } = autoFixReadme(input, { multiLineStyle: 'indented' });
    expect(updated).toMatch(/    line1/);
    expect(updated).not.toMatch(/```/); // fences removed
    expect(changes.some(c => /Converted multi-line fenced block/.test(c))).toBe(true);
  });

  it('retains fenced block when style fenced', () => {
    const input = [
      '=== Plugin Name ===',
      '',
      '== Description ==',
      '```',
      'line1',
      'line2',
      '```'
    ].join('\n');
    const { updated } = autoFixReadme(input, { multiLineStyle: 'fenced' });
    const fenceCount = (updated.match(/```/g) || []).length;
    expect(fenceCount).toBe(2);
  });

  it('converts hash headings', () => {
    const input = '# Title\n## Subtitle\n### Smaller';
    const { updated } = autoFixReadme(input);
    expect(updated).toContain('== Title ==');
    expect(updated).toContain('== Subtitle ==');
    expect(updated).toContain('= Smaller =');
  });
});
