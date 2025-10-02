"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const markdownParser_1 = require("./src/parser/markdownParser");
// Test the link processing
const testContent = `
This is a test with a link: [WordPress](https://wordpress.org)

Another link: [Example](http://example.com "Title")

Reference-style link: [Markdown Documentation][markdown syntax]

[markdown syntax]: https://daringfireball.net/projects/markdown/syntax

Some text with **bold** and *italic* and \`code\`.

More content after the links.
`;
console.log('Input:');
console.log(testContent);
console.log('\nOutput:');
console.log(markdownParser_1.WordPressMarkdownParser.parse(testContent));
//# sourceMappingURL=debug-links.js.map