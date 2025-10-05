# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog (https://keepachangelog.com/en/1.0.0/) and this project adheres to Semantic Versioning (https://semver.org/spec/v2.0.0.html).

## [0.1.6] - 2025-10-05
### Removed
- Preview Auto-fix Diff command (deprecated; fully removed from activation, registration, and docs).

### Changed
- Lint configuration: disabled `curly` rule to reduce noise from style-only warnings.

### Added
- Sanity test ensuring only expected contributed commands are present (guards against accidental reintroduction of removed commands).

### Internal
- Version bump for housekeeping release after feature removal.

## [0.1.5] - 2025-10-05
### Added
- Hash heading normalization tests covering missing-space variants, trailing stray hashes, and deep level headings.

### Changed
- Improved hash heading auto-fix: now converts `#Title`, `##Title`, `#  Title  ` and `# Title #` forms reliably to proper `==` / `=` style.
- Quick fix for hash headings now mirrors auto-fix logic (uses heading level instead of word-count heuristic; trims stray hashes & extra spaces).
- Malformed equals-style heading normalization made more robust (prevents duplicated or partially malformed replacements).

### Fixed
- Prevented duplication when converting malformed hash or equals headings in combination with completion suggestions.
- Ensured trailing stray `#` characters are removed instead of retained in normalized headings.

### Internal
- Strengthened idempotency of code actions and auto-fix transformations.
- Expanded test suite to 22 passing tests.

## [0.1.4] - 2025-10-04
### Changed
- Extension name: "WordPress Readme Preview" → "WordPress Readme"
- Enhanced description to highlight syntax highlighting and IntelliSense features
- Updated keywords to include "syntax highlighting", "intellisense", "autocomplete"

### Fixed
- IntelliSense completion no longer duplicates opening `==` when user has already typed them

## [0.1.3] - 2025-10-04
### Added
- Section heading IntelliSense completion provider (type `==` then space for valid section suggestions)

## [0.1.1] - 2025-10-03
### Added
- wordpress.org tabbed preview theme (Description, Installation, FAQ, Screenshots, Changelog, Reviews placeholder)
- Accessible embedded screenshot gallery with thumbnails & keyboard navigation
- Forced background mode setting (`auto` | `light` | `dark`)
- Tag display refinement to uppercase bracketed form `[TAG]`

### Changed
- README updated with new features and configuration table
- Improved icon and banner layout positioning in wordpress.org theme

### Fixed
- Ensured all discovered screenshots load (removed earlier limitation)
- Gallery navigation contrast and focus handling improvements

## [0.1.0] - 2025-10-02
### Added
- Initial release with live WordPress.org-style preview
- Validation engine with precise line/column diagnostics & quality score
- Scroll synchronization (optional)
- Context menu integration across explorer, editor tab, and editor content
- Custom parser for WordPress readme formatting (FAQ, changelog headers, etc.)

[0.1.6]: https://github.com/soderlind/wordpress-readme-preview/compare/v0.1.5...v0.1.6
[0.1.4]: https://github.com/soderlind/wordpress-readme-preview/compare/v0.1.3...v0.1.4
[0.1.5]: https://github.com/soderlind/wordpress-readme-preview/compare/v0.1.4...v0.1.5
[0.1.3]: https://github.com/soderlind/wordpress-readme-preview/compare/v0.1.1...v0.1.3
[0.1.1]: https://github.com/soderlind/wordpress-readme-preview/compare/v0.1.0...v0.1.1
