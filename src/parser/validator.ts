import { ParsedReadme, ReadmeHeader, ReadmeSection } from './readmeParser';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100 quality score
}

export interface ValidationError {
  type: 'error' | 'warning' | 'info';
  field?: string;
  message: string;
  line?: number;
  column?: number;
  endColumn?: number;
  suggestion?: string;
}

export interface ValidationWarning extends ValidationError {
  type: 'warning';
}

export class ReadmeValidator {
  private static readonly REQUIRED_FIELDS: (keyof ReadmeHeader)[] = [
    'pluginName',
    'contributors',
    'tags',
    'testedUpTo',
    'stableTag',
    'license',
    'shortDescription'
  ];

  private static readonly RECOMMENDED_SECTIONS = [
    'Description',
    'Installation',
    'Frequently Asked Questions',
    'Screenshots',
    'Changelog'
  ];

  private static readonly MAX_SHORT_DESCRIPTION_LENGTH = 150;
  private static readonly MAX_TAGS = 5;
  private static readonly MAX_FILE_SIZE = 10 * 1024; // 10KB
  private static readonly MAX_UPGRADE_NOTICE_LENGTH = 300;

  public static validate(readme: ParsedReadme): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Header validation
    this.validateHeader(readme.header, errors, warnings, readme.rawContent);

    // Sections validation
    this.validateSections(readme.sections, errors, warnings);

    // Content validation
    this.validateContent(readme, errors, warnings);

    // File size validation
    this.validateFileSize(readme.rawContent, warnings);

    const score = this.calculateScore(errors, warnings, readme);

    return {
      isValid: errors.length === 0,
      errors: [...errors, ...warnings],
      warnings,
      score
    };
  }

  private static validateHeader(header: ReadmeHeader, errors: ValidationError[], warnings: ValidationWarning[], rawContent: string): void {
    // Required fields
    this.REQUIRED_FIELDS.forEach(field => {
      const value = header[field];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        errors.push({
          type: 'error',
          field,
          message: `${this.fieldDisplayName(field)} is required`,
          suggestion: `Add the ${this.fieldDisplayName(field)} field to your readme header`
        });
      }
    });

    // Plugin name validation
    if (header.pluginName) {
      if (header.pluginName.length < 3) {
        warnings.push({
          type: 'warning',
          field: 'pluginName',
          message: 'Plugin name should be at least 3 characters long'
        });
      }
      if (header.pluginName.length > 60) {
        warnings.push({
          type: 'warning',
          field: 'pluginName',
          message: 'Plugin name should be 60 characters or less for better display'
        });
      }
    }

    // Contributors validation
    if (header.contributors) {
      header.contributors.forEach((contributor, index) => {
        if (!this.isValidWordPressUsername(contributor)) {
          warnings.push({
            type: 'warning',
            field: 'contributors',
            message: `Contributor "${contributor}" doesn't appear to be a valid WordPress.org username`,
            suggestion: 'Use only WordPress.org usernames for proper profile linking'
          });
        }
      });
    }

    // Tags validation
    if (header.tags) {
      if (header.tags.length > this.MAX_TAGS) {
        warnings.push({
          type: 'warning',
          field: 'tags',
          message: `Maximum ${this.MAX_TAGS} tags recommended, you have ${header.tags.length}`,
          suggestion: 'Consider using fewer, more focused tags'
        });
      }

      header.tags.forEach(tag => {
        if (tag.length > 50) {
          warnings.push({
            type: 'warning',
            field: 'tags',
            message: `Tag "${tag}" is very long and may not display properly`
          });
        }
      });
    }

    // Version format validation
    this.validateVersionFormat(header.requiresAtLeast, 'requiresAtLeast', 'Requires at least', warnings);
    this.validateVersionFormat(header.testedUpTo, 'testedUpTo', 'Tested up to', warnings);
    this.validateVersionFormat(header.stableTag, 'stableTag', 'Stable tag', warnings);
    
    if (header.requiresPHP) {
      this.validateVersionFormat(header.requiresPHP, 'requiresPHP', 'Requires PHP', warnings);
    }

    // Short description validation
    if (header.shortDescription) {
      if (header.shortDescription.length > this.MAX_SHORT_DESCRIPTION_LENGTH) {
        warnings.push({
          type: 'warning',
          field: 'shortDescription',
          message: `Short description is ${header.shortDescription.length} characters (max ${this.MAX_SHORT_DESCRIPTION_LENGTH})`,
          suggestion: 'Shorten the description for better display on WordPress.org'
        });
      }

      if (header.shortDescription.includes('<') || header.shortDescription.includes('>')) {
        warnings.push({
          type: 'warning',
          field: 'shortDescription',
          message: 'Short description should not contain HTML markup',
          suggestion: 'Remove HTML tags from the short description'
        });
      }

      if (header.shortDescription.length < 20) {
        warnings.push({
          type: 'warning',
          field: 'shortDescription',
          message: 'Short description is very brief, consider adding more detail'
        });
      }
    }

    // License validation
    if (header.license && !this.isGPLCompatibleLicense(header.license)) {
      warnings.push({
        type: 'warning',
        field: 'license',
        message: 'License may not be GPL-compatible',
        suggestion: 'WordPress.org requires GPL-compatible licenses'
      });
    }

    // URL validation
    if (header.donateLink && !this.isValidUrl(header.donateLink)) {
      warnings.push({
        type: 'warning',
        field: 'donateLink',
        message: 'Donate link appears to be invalid'
      });
    }

    if (header.licenseURI && !this.isValidUrl(header.licenseURI)) {
      warnings.push({
        type: 'warning',
        field: 'licenseURI',
        message: 'License URI appears to be invalid'
      });
    }
  }

  private static validateSections(sections: ReadmeSection[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    const sectionTitles = sections.map(s => s.title.toLowerCase());

    // Check for recommended sections
    this.RECOMMENDED_SECTIONS.forEach(recommendedSection => {
      if (!sectionTitles.includes(recommendedSection.toLowerCase())) {
        warnings.push({
          type: 'warning',
          message: `Consider adding a "${recommendedSection}" section`,
          suggestion: `The ${recommendedSection} section helps users understand and use your plugin`
        });
      }
    });

    // Validate individual sections
    sections.forEach(section => {
      this.validateSection(section, errors, warnings);
    });

    // Check section order (Description should be first)
    if (sections.length > 0 && sections[0].title.toLowerCase() !== 'description') {
      warnings.push({
        type: 'warning',
        message: 'Description section should typically be the first section',
        line: sections[0].lineStart
      });
    }
  }

  private static validateSection(section: ReadmeSection, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Empty sections
    if (!section.content.trim()) {
      warnings.push({
        type: 'warning',
        message: `Section "${section.title}" is empty`,
        line: section.lineStart,
        suggestion: 'Add content to this section or remove it'
      });
      return;
    }

    // Section-specific validation
    switch (section.title.toLowerCase()) {
      case 'description':
        this.validateDescriptionSection(section, warnings);
        break;
      case 'installation':
        this.validateInstallationSection(section, warnings);
        break;
      case 'frequently asked questions':
      case 'faq':
        this.validateFAQSection(section, warnings);
        break;
      case 'screenshots':
        this.validateScreenshotsSection(section, warnings);
        break;
      case 'changelog':
        this.validateChangelogSection(section, warnings);
        break;
      case 'upgrade notice':
        this.validateUpgradeNoticeSection(section, warnings);
        break;
    }
  }

  private static validateDescriptionSection(section: ReadmeSection, warnings: ValidationWarning[]): void {
    if (section.content.length < 100) {
      warnings.push({
        type: 'warning',
        message: 'Description section is quite short, consider adding more detail',
        line: section.lineStart
      });
    }

    if (section.content.length > 2000) {
      warnings.push({
        type: 'warning',
        message: 'Description section is very long, consider moving some content to other sections',
        line: section.lineStart
      });
    }
  }

  private static validateInstallationSection(section: ReadmeSection, warnings: ValidationWarning[]): void {
    const hasSteps = /^\d+\./.test(section.content);
    if (!hasSteps && section.content.length > 50) {
      warnings.push({
        type: 'warning',
        message: 'Consider using numbered steps in the Installation section',
        line: section.lineStart
      });
    }
  }

  private static validateFAQSection(section: ReadmeSection, warnings: ValidationWarning[]): void {
    const questionCount = (section.content.match(/^=\s*.+\s*=$/gm) || []).length;
    if (questionCount === 0) {
      warnings.push({
        type: 'warning',
        message: 'FAQ section should contain questions in the format "= Question ="',
        line: section.lineStart
      });
    }
  }

  private static validateScreenshotsSection(section: ReadmeSection, warnings: ValidationWarning[]): void {
    const screenshotCount = (section.content.match(/^\d+\./gm) || []).length;
    if (screenshotCount === 0) {
      warnings.push({
        type: 'warning',
        message: 'Screenshots section should contain numbered items (1. Description)',
        line: section.lineStart
      });
    }
  }

  private static validateChangelogSection(section: ReadmeSection, warnings: ValidationWarning[]): void {
    const versionCount = (section.content.match(/^=\s*[\d.]+\s*=$/gm) || []).length;
    if (versionCount === 0) {
      warnings.push({
        type: 'warning',
        message: 'Changelog section should contain version entries in the format "= 1.0 ="',
        line: section.lineStart
      });
    }
  }

  private static validateUpgradeNoticeSection(section: ReadmeSection, warnings: ValidationWarning[]): void {
    const versions = section.content.split(/^=\s*[\d.]+\s*=$/gm);
    versions.forEach((versionContent, index) => {
      if (index > 0 && versionContent.trim().length > this.MAX_UPGRADE_NOTICE_LENGTH) {
        warnings.push({
          type: 'warning',
          message: `Upgrade notice for version should be ${this.MAX_UPGRADE_NOTICE_LENGTH} characters or less`,
          line: section.lineStart
        });
      }
    });
  }

  private static validateContent(readme: ParsedReadme, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const lines = readme.rawContent.split('\n');
    // Detect malformed headers (must happen early so user sees structural issues first)
    // Valid patterns we allow elsewhere:
    //  - === Plugin Name === (top plugin name header handled in parser)
    //  - == Section Title == (section headers)
    //  - = Sub Item = (FAQ / Changelog inner headings)
    // Anything that starts with '=' but does not fully match one of these should be flagged.
    const validHeaderPatterns = [
      /^===\s+.+?\s+===$/,   // plugin main title
      /^==\s+.+?\s+==$/,     // section heading
      /^=\s+.+?\s+=$/        // inner heading (FAQ questions, changelog versions)
    ];

    lines.forEach((line, index) => {
      if (!line.includes('=')) return; // skip quickly
      const trimmed = line.trim();
      if (!trimmed.startsWith('=')) return; // only interested in lines beginning with '=' after trim

      const isValid = validHeaderPatterns.some(r => r.test(trimmed));
      if (!isValid) {
        // Examples of malformed lines we want to catch:
        //  '== Description =' (missing trailing '=')
        //  '= Title' (missing trailing '=')
        //  '==Section==' (missing spaces)
        //  '=Title=' (missing spaces around title)
        //  '==== Something ===' (wrong number of leading/trailing '=')
        // Provide a suggestion attempting to normalize.
        let suggestion: string | undefined;
        const coreText = trimmed.replace(/^[=]+\s*/, '').replace(/\s*[=]+$/, '').trim();
        if (trimmed.startsWith('===')) {
          // Probably intended main plugin header
            suggestion = `=== ${coreText} ===`;
        } else if (trimmed.startsWith('==')) {
          suggestion = `== ${coreText} ==`;
        } else {
          suggestion = `= ${coreText} =`;
        }
        errors.push({
          type: 'error',
          message: 'Malformed readme heading syntax',
          line: index + 1,
          column: 0,
          endColumn: line.length,
          suggestion: `Use proper heading format, e.g. "${suggestion}"`
        });
      }
    });
    
    // Check for promotional language - use word boundaries to avoid false positives
    const promotionalWords = ['best', 'ultimate', 'premium', 'advanced', 'professional'];
    promotionalWords.forEach(word => {
      const wordPattern = new RegExp(`\\b${word}\\b`, 'gi');
      lines.forEach((line, index) => {
        let match;
        while ((match = wordPattern.exec(line)) !== null) {
          warnings.push({
            type: 'warning',
            message: `Consider avoiding promotional language like "${word}"`,
            line: index + 1,
            column: match.index,
            endColumn: match.index + match[0].length,
            suggestion: 'Focus on functionality rather than marketing terms'
          });
        }
      });
    });

    // Special case for "pro" - only flag if it appears as standalone word or in certain contexts
    const proPattern = /\b(pro\s+version|pro\s+edition|go\s+pro|\bpro\b(?!\w))/gi;
    lines.forEach((line, index) => {
      let match;
      while ((match = proPattern.exec(line)) !== null) {
        warnings.push({
          type: 'warning',
          message: 'Consider avoiding promotional language like "pro"',
          line: index + 1,
          column: match.index,
          endColumn: match.index + match[0].length,
          suggestion: 'Focus on functionality rather than marketing terms'
        });
      }
    });

    // Heuristic Markdown-ish validation (WordPress directory style)
    // 1. Unclosed / unmatched fenced code blocks (``` or ```lang)
    const fenceIndices: number[] = [];
    lines.forEach((line, idx) => {
      if (/^```/.test(line.trim())) {
        fenceIndices.push(idx);
      }
    });
    if (fenceIndices.length % 2 === 1) {
      const last = fenceIndices[fenceIndices.length - 1];
      warnings.push({
        type: 'warning',
        message: 'Unclosed fenced code block (```)',
        line: last + 1,
        suggestion: 'Close the fenced block or convert to indented / inline code for WordPress'
      });
    }

    // 2. Heading style misuse (# heading)
    lines.forEach((line, idx) => {
      if (/^\s*#+\s+/.test(line) && !/^\s*#\s*\[?\!/.test(line)) { // basic detection
        warnings.push({
          type: 'warning',
          message: 'Hash (#) style headings are not standard in WordPress plugin readme',
          line: idx + 1,
          suggestion: 'Use == Section == or = Sub Item = syntax instead'
        });
      }
    });

    // 3. Unmatched emphasis markers (simple heuristic)
    function escapeRegExp(s: string): string {
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    const countMatches = (text: string, token: string) => (text.match(new RegExp(escapeRegExp(token),'g')) || []).length;
    const totalDoubleAsterisk = countMatches(readme.rawContent, '**');
    if (totalDoubleAsterisk % 2 === 1) {
      warnings.push({
        type: 'warning',
        message: 'Unbalanced bold markers (**)',
        suggestion: 'Ensure bold sections use pairs of ** markers'
      });
    }
    const totalSingleAsterisk = countMatches(readme.rawContent.replace(/\*\*/g,''), '\*');
    if (totalSingleAsterisk % 2 === 1) {
      warnings.push({
        type: 'warning',
        message: 'Unbalanced italic markers (*)',
        suggestion: 'Ensure italic sections use pairs of * markers'
      });
    }

    // 4. Malformed markdown links (missing ]) or )
    lines.forEach((line, idx) => {
      // Detect an opening [text]( without closing ) on same line
      const linkLike = line.match(/\[[^\]]*\]\([^)]*$/);
      if (linkLike) {
        warnings.push({
          type: 'warning',
          message: 'Possible unclosed markdown link',
          line: idx + 1,
          suggestion: 'Close the ) or ensure WordPress compatible formatting'
        });
      }
      // Detect stray [text( or [text] without ( ) properly
      if (/\[[^\]]*$/.test(line)) {
        warnings.push({
          type: 'warning',
          message: 'Unclosed [ bracket - malformed link or formatting',
          line: idx + 1
        });
      }
    });

    // 5. Mixed indentation inside code blocks
    let inFence = false;
    let blockBuffer: { line: number; text: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trimEnd();
      if (/^```/.test(trimmed)) {
        if (!inFence) {
          inFence = true;
          blockBuffer = [];
        } else {
          // closing fence - analyze
          const hasTab = blockBuffer.some(l => /^\t+/.test(l.text));
          const hasSpace = blockBuffer.some(l => /^ +/.test(l.text));
          if (hasTab && hasSpace) {
            warnings.push({
              type: 'warning',
              message: 'Mixed tabs and spaces inside fenced code block',
              line: blockBuffer[0]?.line
            });
          }
          inFence = false;
        }
        continue;
      }
      // Detect indented code group (4-space) sequences
      if (!inFence && /^ {4}\S/.test(raw)) {
        blockBuffer.push({ line: i + 1, text: raw });
        // continue collecting until pattern breaks
        if (i + 1 === lines.length || !/^ {4}\S/.test(lines[i + 1])) {
          const hasTab = blockBuffer.some(l => /^\t+/.test(l.text));
          const hasSpace = blockBuffer.some(l => /^ +/.test(l.text));
          if (hasTab && hasSpace) {
            warnings.push({
              type: 'warning',
              message: 'Mixed indentation inside indented code block',
              line: blockBuffer[0].line
            });
          }
          blockBuffer = [];
        }
      } else if (inFence) {
        blockBuffer.push({ line: i + 1, text: raw });
      }
    }

    // Check for actual email addresses, not just the word "email"
    const emailPattern = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
    lines.forEach((line, index) => {
      let match;
      while ((match = emailPattern.exec(line)) !== null) {
        warnings.push({
          type: 'warning',
          message: 'Avoid including email addresses in readme, use WordPress.org support forums instead',
          line: index + 1,
          column: match.index,
          endColumn: match.index + match[0].length
        });
      }
    });
  }

  private static validateFileSize(content: string, warnings: ValidationWarning[]): void {
    const sizeInBytes = content.length; // Approximate byte size
    if (sizeInBytes > this.MAX_FILE_SIZE) {
      warnings.push({
        type: 'warning',
        message: `Readme file is ${Math.round(sizeInBytes / 1024)}KB (recommended max: ${this.MAX_FILE_SIZE / 1024}KB)`,
        suggestion: 'Consider moving detailed documentation to your website'
      });
    }
  }

  private static validateVersionFormat(version: string, field: string, displayName: string, warnings: ValidationWarning[]): void {
    if (!version) return;
    
    if (!/^\d+\.\d+(\.\d+)?$/.test(version)) {
      warnings.push({
        type: 'warning',
        field,
        message: `${displayName} should be in format X.Y or X.Y.Z (got "${version}")`,
        suggestion: 'Use semantic versioning format'
      });
    }
  }

  private static isValidWordPressUsername(username: string): boolean {
    // WordPress usernames: lowercase, numbers, hyphens, underscores, 3-60 chars
    return /^[a-z0-9_-]{3,60}$/.test(username.toLowerCase());
  }

  private static isGPLCompatibleLicense(license: string): boolean {
    const gplCompatible = [
      'gpl', 'gplv2', 'gpl v2', 'gpl-2.0', 'gpl2',
      'gplv3', 'gpl v3', 'gpl-3.0', 'gpl3',
      'mit', 'apache', 'bsd'
    ];
    return gplCompatible.some(compatible => 
      license.toLowerCase().includes(compatible)
    );
  }

  private static isValidUrl(url: string): boolean {
    // Simple URL validation for common cases
    const urlPattern = /^https?:\/\/.+\..+/i;
    return urlPattern.test(url);
  }

  private static fieldDisplayName(field: string): string {
    const displayNames: { [key: string]: string } = {
      pluginName: 'Plugin Name',
      contributors: 'Contributors',
      donateLink: 'Donate Link',
      tags: 'Tags',
      requiresAtLeast: 'Requires at least',
      testedUpTo: 'Tested up to',
      stableTag: 'Stable tag',
      requiresPHP: 'Requires PHP',
      license: 'License',
      licenseURI: 'License URI',
      shortDescription: 'Short Description'
    };
    return displayNames[field] || field;
  }

  private static calculateScore(errors: ValidationError[], warnings: ValidationWarning[], readme: ParsedReadme): number {
    let score = 100;
    
    // Deduct points for errors and warnings
    errors.forEach(error => {
      score -= error.type === 'error' ? 15 : 5;
    });

    // Bonus points for good practices
    const descriptionSection = readme.sections.find(s => s.title.toLowerCase() === 'description');
    if (descriptionSection && descriptionSection.content.length > 200) {
      score += 5;
    }
    
    if (readme.sections.find(s => s.title.toLowerCase() === 'installation')) {
      score += 3;
    }
    
    if (readme.sections.find(s => s.title.toLowerCase().includes('faq'))) {
      score += 3;
    }
    
    if (readme.sections.find(s => s.title.toLowerCase() === 'changelog')) {
      score += 5;
    }

    if (readme.header.requiresPHP) {
      score += 2;
    }

    if (readme.header.licenseURI) {
      score += 2;
    }

    return Math.max(0, Math.min(100, score));
  }
}