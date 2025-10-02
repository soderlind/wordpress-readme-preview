"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readmeParser_1 = require("./src/parser/readmeParser");
const fs = require("fs");
const content = fs.readFileSync('readme.txt', 'utf8');
const parsed = readmeParser_1.ReadmeParser.parse(content);
console.log('=== DESCRIPTION SECTION ===');
const descSection = parsed.sections.find(s => s.title.toLowerCase().includes('description'));
if (descSection) {
    console.log(descSection.content);
}
else {
    console.log('No description section found');
}
console.log('\n=== MARKDOWN EXAMPLE SECTION ===');
const markdownSection = parsed.sections.find(s => s.title.toLowerCase().includes('markdown'));
if (markdownSection) {
    console.log(markdownSection.content);
}
else {
    console.log('No markdown section found');
}
//# sourceMappingURL=debug-readme.js.map