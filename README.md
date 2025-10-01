# WordPress Readme Preview

A Visual Studio Code extension that provides live preview and validation for WordPress plugin `readme.txt` files.

## Features

✅ **Live Preview** - Real-time rendering of readme.txt files as they appear on WordPress.org  
✅ **Validation** - Comprehensive compliance checking with WordPress.org standards  
✅ **Syntax Highlighting** - Enhanced editing experience for readme.txt files  
✅ **Error Detection** - Inline error highlighting and detailed diagnostics  
✅ **WordPress.org Styling** - Accurate preview matching the plugin directory appearance  

## Usage

### Opening Preview

1. Open any `readme.txt` file in VS Code
2. Click the preview button in the editor toolbar, or
3. Use the Command Palette: `WordPress Readme: Open Preview`
4. Use the keyboard shortcut: `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (Mac)

### Validation

- Automatic validation runs as you type
- View issues in the Problems panel
- Click the status bar item to run manual validation
- Use Command Palette: `WordPress Readme: Validate Readme`

### Side-by-Side Preview

- Click "Open Preview to the Side" in the editor toolbar
- Use Command Palette: `WordPress Readme: Open Preview to the Side`

## Validation Features

The extension validates your readme.txt against WordPress.org standards:

### Required Fields
- Plugin Name (`=== Plugin Name ===`)
- Contributors
- Tags (1-5 tags)
- Requires at least (WordPress version)
- Tested up to (WordPress version)
- Stable tag (plugin version)  
- License
- Short description (≤150 characters)

### Content Validation
- Proper header formatting
- Version number formats
- Section structure
- Markdown compliance
- File size recommendations
- WordPress.org compatibility

### Scoring System
- Get a quality score (0-100) for your readme
- Identify areas for improvement
- Follow WordPress.org best practices

## Supported Markdown

The extension supports WordPress.org's Markdown subset:

- **Bold** and *italic* text
- `Inline code` and code blocks
- [Links](https://example.com)
- Ordered and unordered lists
- > Blockquotes
- Video embeds (YouTube, Vimeo, VideoPress)

## Settings

Configure the extension via VS Code settings:

```json
{
  "wordpress-readme.preview.autoOpen": false,
  "wordpress-readme.preview.syncScrolling": true,
  "wordpress-readme.validation.enabled": true,
  "wordpress-readme.validation.showWarnings": true
}
```

## Commands

| Command | Description |
|---------|-------------|
| `WordPress Readme: Open Preview` | Open preview panel |
| `WordPress Readme: Open Preview to the Side` | Open side-by-side preview |
| `WordPress Readme: Validate Readme` | Run validation and show results |

## File Association

The extension automatically activates for:
- Files named `readme.txt`
- Files with `.txt` extension (when they contain WordPress readme content)

## Requirements

- Visual Studio Code 1.74.0 or higher
- No additional dependencies required

## Extension Development

This extension is built with:
- TypeScript
- VS Code Extension API
- Custom WordPress readme.txt parser
- WordPress.org compliance validator

## Resources

- [WordPress Plugin Readme Standard](https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/)
- [WordPress Plugin Directory](https://wordpress.org/plugins/)
- [Readme Validator](https://wordpress.org/plugins/developers/readme-validator/)

## Contributing

Found a bug or have a feature request? Please open an issue on our GitHub repository.

## License

This extension is licensed under the MIT License.