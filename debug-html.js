"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readmeParser_1 = require("./src/parser/readmeParser");
const markdownParser_1 = require("./src/parser/markdownParser");
const fs = require("fs");
const content = fs.readFileSync('readme.txt', 'utf8');
const parsed = readmeParser_1.ReadmeParser.parse(content);
console.log('=== MARKDOWN EXAMPLE SECTION HTML ===');
const markdownSection = parsed.sections.find(s => s.title.toLowerCase().includes('markdown'));
if (markdownSection) {
    console.log('Raw content:');
    console.log(markdownSection.content);
    console.log('\nProcessed HTML:');
    // Process the content like the HTML generator does
    let processedContent = markdownSection.content;
    // Convert FAQ-style headers 
    processedContent = processedContent.replace(/^=\s*(.+?)\s*=$/gm, '### $1');
    // Parse markdown
    processedContent = markdownParser_1.WordPressMarkdownParser.parse(processedContent, {
        allowVideos: true,
        allowHTML: false
    });
    const finalContent = markdownParser_1.WordPressMarkdownParser.processParagraphs(processedContent);
    console.log(finalContent);
}
else {
    console.log('No markdown section found');
}
//# sourceMappingURL=debug-html.js.map