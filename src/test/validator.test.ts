import { describe, it, expect } from 'vitest';
import { ReadmeParser } from '../parser/readmeParser';
import { ReadmeValidator } from '../parser/validator';

function validate(content: string) {
	const parsed = ReadmeParser.parse(content);
	return ReadmeValidator.validate(parsed);
}

const headerLines = [
	'=== Plugin Name ===',
	'Contributors: john, jane',
	'Tags: tag1, tag2',
	// 'Requires at least' intentionally omitted to confirm optional handling
	'Tested up to: 6.5',
	'Stable tag: 1.0.0',
	'License: GPL',
	'Short description that is sufficiently descriptive',
	''
];

function build(sections: string[]): string {
	return headerLines.concat(sections).join('\n');
}

describe('ReadmeValidator', () => {
	it('flags malformed heading', () => {
		const txt = build(['== Description =', 'Body']);
		const r = validate(txt);
		expect(r.errors.some(e => /Malformed readme heading/.test(e.message))).toBe(true);
	});

	it('warns on hash heading', () => {
		const txt = build(['# Description', 'Content']);
		const r = validate(txt);
		expect(r.warnings.some(w => /Hash \(#\) style headings/.test(w.message))).toBe(true);
	});

	it('warns on unclosed fenced block', () => {
		const txt = build(['== Description ==', '```', 'code line']); // no closing fence
		const r = validate(txt);
		expect(r.warnings.some(w => /Unclosed fenced code block/.test(w.message))).toBe(true);
	});

	it('warns on mixed indentation in fenced block', () => {
		const txt = build(['== Description ==', '```', '\tconsole.log(1)', '    console.log(2)', '```']);
		const r = validate(txt);
		expect(r.warnings.some(w => /Mixed tabs and spaces/ .test(w.message))).toBe(true);
	});

	it('warns on unbalanced bold markers', () => {
		const txt = build(['== Description ==', 'This has **unbalanced bold*']);
		const r = validate(txt);
		expect(r.warnings.some(w => /Unbalanced bold markers/.test(w.message))).toBe(true);
	});

	it('warns on malformed link', () => {
		const txt = build(['== Description ==', 'See [link](https://example.com']);
		const r = validate(txt);
		expect(r.warnings.some(w => /Possible unclosed markdown link/.test(w.message))).toBe(true);
	});

	it('errors on missing required field', () => {
		const missingHeader = headerLines.filter(l => !l.startsWith('Contributors:'));
		const txt = missingHeader.concat(['== Description ==', 'Body']).join('\n');
		const r = validate(txt);
		expect(r.errors.some(e => /Contributors is required/.test(e.message))).toBe(true);
	});

	it('does not error when Requires at least is absent', () => {
		const txt = build(['== Description ==', 'Body']);
		const r = validate(txt);
		expect(r.errors.some(e => /Requires at least field is required/.test(e.message))).toBe(false);
	});

	it('produces high score and no errors on clean input', () => {
		const txt = build([
			'== Description ==',
			'A detailed description long enough to get bonus points.'.repeat(5),
			'',
			'== Installation ==',
			'1. Step one',
			'2. Step two',
			'',
			'== Frequently Asked Questions ==',
			'= Question One =',
			'Answer',
			'',
			'== Screenshots ==',
			'1. Screenshot',
			'',
			'== Changelog ==',
			'= 1.0.0 =',
			'Initial release'
		]);
		const r = validate(txt);
		expect(r.errors.filter(e => e.type === 'error').length).toBe(0);
		expect(r.score).toBeGreaterThan(80);
	});
});
