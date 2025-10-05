import { describe, it, expect } from 'vitest';
import { ReadmeParser } from '../parser/readmeParser';

describe('ReadmeParser', () => {
  it('parses basic sections', () => {
    const txt = `=== Plugin Name ===\n\n== Description ==\nBody text\n\n== Changelog ==\n= 1.0.0 =\nInitial`;
    const parsed = ReadmeParser.parse(txt);
    expect(parsed.sections.length).toBe(2);
    expect(parsed.sections.map(s => s.title)).toEqual(['Description', 'Changelog']);
  });

  it('ignores malformed heading (should not create section)', () => {
    const txt = `=== Plugin Name ===\n\n== Description =\nBody`; // malformed trailing equals
    const parsed = ReadmeParser.parse(txt);
    expect(parsed.sections.length).toBe(0);
  });
});
