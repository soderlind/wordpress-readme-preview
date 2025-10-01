# WordPress Readme Preview

A Visual Studio Code extension that provides live preview and validation for WordPress plugin `readme.txt` files with pixel-perfect WordPress.org rendering and comprehensive compliance checking.

## Features

✅ **Live Preview** - Real-time rendering matching WordPress.org appearance  
✅ **Comprehensive Validation** - WordPress.org compliance with precise error positioning  
✅ **Syntax Highlighting** - Enhanced editing experience for readme.txt files  
✅ **Smart Error Detection** - Inline highlighting with exact column positioning  
✅ **Context Menus** - Right-click support in explorer and editor tabs  
✅ **Quality Scoring** - Get 0-100 quality score with improvement suggestions  
✅ **False Positive Prevention** - Accurate detection without hallucinated errors  

## Quick Start

### Opening Preview

**Multiple Ways to Open:**
1. **Right-click** on `readme.txt` file → "Open Preview"
2. **Right-click** on editor tab → "Open Preview" 
3. **Editor toolbar** → Click preview button (📖)
4. **Command Palette** → "WordPress Readme: Open Preview"
5. **Keyboard shortcut** → `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (Mac)

### Validation

**Automatic validation:**
- Runs as you type with real-time feedback
- Precise line/column error positioning
- View all issues in Problems panel
- Status bar shows validation status

**Manual validation:**
- Right-click → "Validate Readme"
- Command Palette → "WordPress Readme: Validate Readme"
- Click status bar validation indicator

### Side-by-Side Preview

- **Right-click** → "Open Preview to the Side"
- **Editor toolbar** → "Open Preview to the Side" button
- **Command Palette** → "WordPress Readme: Open Preview to the Side"

## Validation Features

### Comprehensive WordPress.org Compliance

**Required Header Fields:**
- ✅ Plugin Name (`=== Plugin Name ===`)
- ✅ Contributors (WordPress.org usernames)
- ✅ Tags (1-5 recommended tags)
- ✅ Requires at least (WordPress version)
- ✅ Tested up to (WordPress version)  
- ✅ Stable tag (plugin version)
- ✅ License (GPL-compatible)
- ✅ Short description (≤150 characters)

**Advanced Content Validation:**
- 🎯 **Precise Error Positioning** - Exact line/column highlighting
- 🚫 **False Positive Prevention** - Smart detection avoids hallucinated errors
- 📏 **Length Validation** - Character limits for descriptions and notices
- 🔗 **URL Validation** - Donate links and license URIs
- 📝 **Section Structure** - Proper heading hierarchy and formatting
- 🏷️ **Version Format** - Semantic versioning compliance
- 📊 **File Size** - WordPress.org size recommendations

**Quality Scoring (0-100):**
- Real-time scoring as you edit
- Detailed suggestions for improvement  
- WordPress.org best practice compliance
- Bonus points for recommended sections

**Smart Detection:**
- ❌ **No false "pro" warnings** - Won't flag "provided", "process", "project"
- ❌ **No false email warnings** - Only flags actual email addresses
- ✅ **Context-aware validation** - Understands WordPress readme structure

## WordPress.org Markdown Support

**Full compatibility with WordPress.org rendering:**

- **Bold** and *italic* text formatting
- `Inline code` with proper HTML escaping (`<?php code(); ?>`)
- Fenced code blocks with syntax highlighting
- [Links](https://example.com) with title attributes  
- Ordered and unordered lists with nesting
- > Blockquotes for emphasis
- Video embeds (YouTube, Vimeo, VideoPress)
- FAQ sections with `= Question =` format
- Version headers in changelog `= 1.0 =`

**Accurate Rendering:**
- Matches WordPress.org plugin directory exactly
- Proper HTML escaping for security
- Responsive design for different screen sizes
- WordPress.org color scheme and typography

## Configuration

Customize the extension behavior via VS Code settings:

```json
{
  // Auto-open preview when opening readme.txt files
  "wordpress-readme.preview.autoOpen": false,
  
  // Synchronize scrolling between editor and preview
  "wordpress-readme.preview.syncScrolling": true,
  
  // Enable automatic validation as you type
  "wordpress-readme.validation.enabled": true,
  
  // Show validation warnings (not just errors)
  "wordpress-readme.validation.showWarnings": true
}
```

## Available Commands

| Command | Keyboard Shortcut | Description |
|---------|-------------------|-------------|
| `WordPress Readme: Open Preview` | `Ctrl+Shift+V` | Open preview in current editor group |
| `WordPress Readme: Open Preview to the Side` | - | Open side-by-side preview |
| `WordPress Readme: Validate Readme` | - | Run validation and show detailed results |

## Context Menu Integration

**Right-click anywhere for quick access:**
- **File Explorer** - Right-click `readme.txt` file
- **Editor Tab** - Right-click on the tab title
- **Editor Content** - Right-click inside the editor

All context menus provide instant access to preview and validation commands.

## File Association

The extension automatically activates for:
- Files named `readme.txt`
- Files with `.txt` extension (when they contain WordPress readme content)

## Requirements

- Visual Studio Code 1.74.0 or higher
- No additional dependencies required

## Technical Features

### Architecture
- **TypeScript** - Type-safe development with full IntelliSense
- **Custom Parser** - Purpose-built WordPress readme.txt parser
- **Precise Validation** - Line/column accurate error positioning
- **WordPress.org Compliance** - Matches official validation standards
- **Performance Optimized** - Real-time validation without lag

### Key Bug Fixes
- ✅ **Section Header Regex** - Fixed false matches with plugin names
- ✅ **Inline Code Rendering** - Proper HTML escaping for `<?php ?>`
- ✅ **False Positive Prevention** - Smart promotional language detection  
- ✅ **Diagnostic Updates** - No duplicate errors, proper refresh
- ✅ **Column Positioning** - Exact error highlighting

## Validation Examples

**✅ Good:**
```
=== My Plugin ===
Contributors: myusername
Tags: tag1, tag2
Requires at least: 5.0
Tested up to: 6.3
```

**❌ Issues Detected:**
- Missing required fields (Contributors, Tags, etc.)
- Invalid version formats ("latest" instead of "6.3")
- Overly promotional language ("Best Ultimate Plugin")
- Actual email addresses in content
- Short descriptions over 150 characters

## Resources & References

- 📖 [WordPress Plugin Readme Standard](https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/)
- 🔍 [Official Readme Validator](https://wordpress.org/plugins/developers/readme-validator/)
- 🏪 [WordPress Plugin Directory](https://wordpress.org/plugins/)
- 📋 [Plugin Development Guidelines](https://developer.wordpress.org/plugins/)
- 🎨 [WordPress.org Design Patterns](https://wordpress.org/about/logos/)

## Troubleshooting

**Common Issues:**
- **No syntax highlighting?** → File must be named `readme.txt`
- **Validation not running?** → Check settings: `wordpress-readme.validation.enabled`
- **Context menu missing?** → Reload VS Code window after installation
- **Preview not updating?** → Ensure file is saved (auto-save recommended)

## Contributing

🐛 **Bug Reports:** Open issues with specific readme.txt examples  
💡 **Feature Requests:** Suggest improvements for WordPress.org compliance  
🔧 **Pull Requests:** Contributions welcome for parser and validation improvements  

## License

MIT License - Free for personal and commercial use.