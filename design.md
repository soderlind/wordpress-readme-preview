# WordPress Readme.txt Preview Extension - Design Document

## Overview

A VS Code extension that provides a live preview of WordPress `readme.txt` files, similar to the built-in Markdown preview functionality. This extension will parse WordPress plugin readme files and render them as they would appear on the WordPress.org plugin directory.

## Core Requirements

### 1. WordPress Readme.txt Specification Support

Based on the [WordPress Plugin Readme Standard](https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/), the extension must support:

#### Header Section
- **Plugin Name** (enclosed in `=== ===`)
- **Contributors** (comma-separated WordPress.org usernames)
- **Donate link** (optional)
- **Tags** (1-5 comma-separated terms)
- **Requires at least** (minimum WordPress version)
- **Tested up to** (tested WordPress version)
- **Stable tag** (plugin version)
- **Requires PHP** (optional, minimum PHP version)
- **License** (GPL-compatible license)
- **License URI** (optional)
- **Short description** (max 150 characters, no markup)

#### Standard Sections
- **Description** (long description with Markdown support)
- **Installation** (optional custom install instructions)
- **Frequently Asked Questions** (FAQ format)
- **Screenshots** (numbered list with descriptions)
- **Changelog** (version history, most recent first)
- **Upgrade Notice** (max 300 characters per version)
- **Arbitrary sections** (custom sections in moderation)

#### Content Features
- **Markdown support** (WordPress.org's customized subset)
- **Video embedding** (YouTube, Vimeo, VideoPress)
- **Code blocks** with backticks
- **Links** with brackets and parenthesis
- **Lists** (ordered and unordered)
- **Emphasis** (*italic*, **bold**)
- **Blockquotes** (email style)

### 2. VS Code Integration Features

#### Core Functionality
- **Live Preview** - Real-time rendering as user types
- **Preview Panel** - Side-by-side or tab-based preview
- **File Association** - Automatic activation for `readme.txt` files
- **Syntax Highlighting** - Enhanced editing experience for readme.txt

#### Commands
- `WordPress Readme: Open Preview` - Open preview panel
- `WordPress Readme: Open Preview to the Side` - Side-by-side preview
- `WordPress Readme: Validate Readme` - Check for compliance issues

#### UI Elements
- **Preview Panel** - Styled to match WordPress.org appearance
- **Status Bar** - Show validation status and character counts
- **Command Palette** integration
- **Context Menu** options for readme.txt files

### 3. Validation & Compliance

#### Header Validation
- Required fields present (Plugin Name, Contributors, Tags, etc.)
- Field format compliance (version numbers, tag count, etc.)
- Character limits (short description ≤ 150 chars)
- WordPress.org username format

#### Content Validation
- Section header formatting (`== Section ==`)
- Markdown syntax compliance
- File size recommendations (< 10KB)
- Link format validation
- Image reference format

#### Warning System
- **Errors** - Must fix issues (missing required fields)
- **Warnings** - Should fix issues (long descriptions, formatting)
- **Info** - Suggestions (optimization tips)

### 4. Rendering Engine

#### HTML Generation
- Convert readme.txt sections to semantic HTML
- Apply WordPress.org-like styling
- Handle custom Markdown subset properly
- Support video embedding
- Responsive design for different panel sizes

#### Styling
- Match WordPress.org plugin directory appearance
- Support VS Code themes (light/dark mode compatibility)
- Professional typography and spacing
- Highlight validation issues visually

## Technical Architecture

### Extension Structure
```
wordpress-readme-preview/
├── package.json              # Extension manifest
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── parser/
│   │   ├── readmeParser.ts   # Core readme.txt parser
│   │   ├── markdownParser.ts # WordPress Markdown subset parser
│   │   └── validator.ts      # Compliance validation
│   ├── preview/
│   │   ├── previewProvider.ts # WebView content provider
│   │   ├── htmlGenerator.ts   # HTML generation
│   │   └── styles.css         # WordPress.org-like styling
│   └── utils/
│       ├── fileWatcher.ts     # File change detection
│       └── constants.ts       # WordPress specs constants
├── media/                     # Extension icons and assets
├── syntaxes/
│   └── readme-txt.tmLanguage.json # Syntax highlighting
└── README.md                  # Extension documentation
```

### Core Components

#### 1. Readme Parser (`readmeParser.ts`)
- Parse header section with field extraction
- Identify and parse standard sections
- Handle custom sections
- Maintain line number mapping for error reporting

#### 2. Markdown Parser (`markdownParser.ts`)
- WordPress.org's Markdown subset implementation
- Video URL detection and embedding
- Link processing with WordPress-specific rules
- Code block and emphasis handling

#### 3. Validator (`validator.ts`)
- Field presence and format validation
- Character count enforcement
- WordPress.org compliance checking
- Generate actionable error/warning messages

#### 4. Preview Provider (`previewProvider.ts`)
- WebView management
- Real-time content updates
- Theme synchronization
- Resource loading (CSS, images)

#### 5. HTML Generator (`htmlGenerator.ts`)
- Convert parsed readme to HTML
- Apply semantic markup
- Inject validation highlights
- Handle special WordPress.org formatting

### VS Code API Integration

#### Activation Events
```json
{
  "activationEvents": [
    "onLanguage:readme-txt",
    "onCommand:wordpress-readme.showPreview",
    "onWebviewPanel:wordpress-readme-preview"
  ]
}
```

#### File Associations
```json
{
  "languages": [{
    "id": "readme-txt",
    "aliases": ["WordPress Readme", "readme-txt"],
    "extensions": ["readme.txt"],
    "configuration": "./language-configuration.json"
  }]
}
```

#### Commands
```json
{
  "commands": [
    {
      "command": "wordpress-readme.showPreview",
      "title": "Open Preview",
      "category": "WordPress Readme",
      "icon": "$(preview)"
    },
    {
      "command": "wordpress-readme.showPreviewToSide",
      "title": "Open Preview to the Side",
      "category": "WordPress Readme",
      "icon": "$(open-preview)"
    }
  ]
}
```

## User Experience

### Discovery & Activation
1. User opens a `readme.txt` file
2. Extension automatically activates
3. Command palette shows WordPress Readme commands
4. Context menu includes preview options

### Preview Workflow
1. User invokes preview command or clicks preview button
2. Preview panel opens with parsed content
3. Real-time updates as user edits the file
4. Validation feedback appears inline and in problems panel

### Validation Feedback
- **Inline highlights** in preview for issues
- **Problems panel** integration for error navigation
- **Status bar** indicators for overall health
- **Hover tooltips** with fix suggestions

## Implementation Phases

### Phase 1: Core Parser & Basic Preview
- Readme.txt parser implementation
- Basic HTML generation
- Simple preview panel
- File watching and updates

### Phase 2: Enhanced Rendering & Validation
- WordPress.org-accurate styling
- Comprehensive validation system
- Error highlighting and reporting
- Markdown subset implementation

### Phase 3: Advanced Features & Polish
- Video embedding support
- Syntax highlighting for readme.txt
- Configuration options
- Performance optimizations

### Phase 4: Extension & Testing
- Marketplace publication
- User feedback integration
- Bug fixes and improvements
- Documentation and examples

## Success Metrics

### Functionality
- ✅ Accurate WordPress.org-style rendering
- ✅ Real-time preview updates
- ✅ Comprehensive validation coverage
- ✅ Error-free parsing of valid readme.txt files

### User Experience
- ✅ Intuitive discovery and activation
- ✅ Responsive and fast preview updates
- ✅ Clear validation feedback
- ✅ Seamless VS Code integration

### Quality
- ✅ No false positive validation errors
- ✅ Handles edge cases gracefully
- ✅ Compatible with VS Code themes
- ✅ Memory efficient for large files

## Future Enhancements

### Advanced Features
- **Template generation** - Create readme.txt from templates
- **Plugin scaffolding** - Generate complete plugin structure
- **Live WordPress.org preview** - Test against actual WordPress.org parser
- **Translation support** - Multiple language readme files

### Integration
- **WordPress CLI integration** - Validate during plugin development
- **Git hooks** - Pre-commit readme validation
- **Plugin development tools** - Integration with other WordPress dev extensions

### Community
- **Readme templates** - Community-contributed templates
- **Best practices guide** - Built-in documentation
- **Plugin directory stats** - Show how readme compares to successful plugins