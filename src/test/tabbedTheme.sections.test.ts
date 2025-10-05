import { describe, it, expect } from 'vitest';
import { ReadmeParser } from '../parser/readmeParser';
import { HtmlGenerator } from '../preview/htmlGenerator';
import { vi } from 'vitest';

// Mock vscode module to satisfy htmlGenerator import in unit context
vi.mock('vscode', () => {
  return {
    Uri: {
      joinPath: (...parts: any[]) => parts[parts.length - 1],
      parse: (v: string) => ({ toString: () => v })
    }
  };
});

// Minimal stubs for VS Code types used inside HtmlGenerator
// We'll monkey-patch methods that rely on webview specifics.
const fakeUri: any = { toString: () => 'vscode-resource://fake' };
const fakeWebview: any = {
  asWebviewUri: (u: any) => u,
  cspSource: 'vscode-resource:'
};
const fakeContext: any = { extensionUri: fakeUri };

function extractPanel(html: string, id: string): string | undefined {
  // Use [\s\S] to match any content including newlines greedily but stop at first closing </div> of the panel.
  const re = new RegExp(`<div role=\"tabpanel\" id=\"panel-${id}\"[\\s\\S]*?<\\/div>`,'i');
  const m = html.match(re);
  return m ? m[0] : undefined;
}

describe('Tabbed theme section mapping', () => {
  it('maps Frequently Asked Questions to FAQ tab regardless of order', async () => {
    const content = `=== Plugin Name ===\nContributors: a\nTags: one\nRequires at least: 5.0\nTested up to: 6.3\nStable tag: 1.0\nLicense: GPLv2\n\n== Installation ==\nSteps here\n\n== Frequently Asked Questions ==\n= What? =\nBecause.\n\n== Description ==\nSome description text.\n`;    
    const parsed = ReadmeParser.parse(content);
    const generator = new HtmlGenerator(fakeContext as any);
    const validation: any = { errors: [], warnings: [], score: 100 };
    const html = await generator.generateHtml(parsed, validation, { resource: fakeUri, webview: fakeWebview, extensionUri: fakeUri, theme: 'wordpress-org' });

    const faqPanel = extractPanel(html, 'faq');
    expect(faqPanel).toBeDefined();
    expect(faqPanel).toMatch(/What\?/);

    const descPanel = extractPanel(html, 'description');
    expect(descPanel).toBeDefined();
  });

  it('supports simple FAQ heading labeled just FAQ', async () => {
    const content = `=== Plugin Name ===\nContributors: a\nTags: one\nRequires at least: 5.0\nTested up to: 6.3\nStable tag: 1.0\nLicense: GPLv2\n\n== FAQ ==\n= Why? =\nBecause.\n\n== Description ==\nSome description text.\n`;    
    const parsed = ReadmeParser.parse(content);
    const generator = new HtmlGenerator(fakeContext as any);
    const validation: any = { errors: [], warnings: [], score: 100 };
    const html = await generator.generateHtml(parsed, validation, { resource: fakeUri, webview: fakeWebview, extensionUri: fakeUri, theme: 'wordpress-org' });

    const faqPanel = extractPanel(html, 'faq');
    expect(faqPanel).toBeDefined();
    expect(faqPanel).toMatch(/Why\?/);
  });
});
