export interface ReadmeHeader {
  pluginName: string;
  contributors: string[];
  donateLink?: string;
  tags: string[];
  requiresAtLeast: string;
  testedUpTo: string;
  stableTag: string;
  requiresPHP?: string;
  license: string;
  licenseURI?: string;
  shortDescription: string;
}

export interface ReadmeSection {
  title: string;
  content: string;
  level: number;
  lineStart: number;
  lineEnd: number;
}

export interface ParsedReadme {
  header: ReadmeHeader;
  sections: ReadmeSection[];
  rawContent: string;
  errors: string[];
  warnings: string[];
}

export class ReadmeParser {
  private static readonly HEADER_FIELDS = {
    PLUGIN_NAME: /^===\s*(.+?)\s*===$/,
    CONTRIBUTORS: /^Contributors:\s*(.+)$/i,
    DONATE_LINK: /^Donate link:\s*(.+)$/i,
    TAGS: /^Tags:\s*(.+)$/i,
    REQUIRES_AT_LEAST: /^Requires at least:\s*(.+)$/i,
    TESTED_UP_TO: /^Tested up to:\s*(.+)$/i,
    STABLE_TAG: /^Stable tag:\s*(.+)$/i,
    REQUIRES_PHP: /^Requires PHP:\s*(.+)$/i,
    LICENSE: /^License:\s*(.+)$/i,
    LICENSE_URI: /^License URI:\s*(.+)$/i
  };

    // Define section patterns - match exactly 2 equals signs (not 3)  
    private static readonly SECTION_HEADER = /^==\s+(.+?)\s+==$/;  public static parse(content: string): ParsedReadme {
    const lines = content.split('\n');
    const result: ParsedReadme = {
      header: this.parseHeader(lines),
      sections: this.parseSections(lines),
      rawContent: content,
      errors: [],
      warnings: []
    };

    this.validateParsedContent(result);
    return result;
  }

  private static parseHeader(lines: string[]): ReadmeHeader {
    const header: Partial<ReadmeHeader> = {};
    let shortDescriptionStart = -1;
    let headerEnd = -1;

    // Find plugin name (first line matching === pattern)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const pluginNameMatch = line.match(this.HEADER_FIELDS.PLUGIN_NAME);
      
      if (pluginNameMatch) {
        header.pluginName = pluginNameMatch[1].trim();
        break;
      }
    }

    // Parse header fields
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Stop at first section header
      if (this.SECTION_HEADER.test(line)) {
        headerEnd = i;
        break;
      }

      // Check for each header field
      const contributorsMatch = line.match(this.HEADER_FIELDS.CONTRIBUTORS);
      if (contributorsMatch) {
        const contributorText = contributorsMatch[1].trim();
        // Skip example text in parentheses
        if (!contributorText.startsWith('(') && contributorText !== '') {
          header.contributors = contributorText.split(',').map(c => c.trim());
        }
        continue;
      }

      const donateMatch = line.match(this.HEADER_FIELDS.DONATE_LINK);
      if (donateMatch) {
        header.donateLink = donateMatch[1].trim();
        continue;
      }

      const tagsMatch = line.match(this.HEADER_FIELDS.TAGS);
      if (tagsMatch) {
        const tagsText = tagsMatch[1].trim();
        if (tagsText !== '') {
          header.tags = tagsText.split(',').map(t => t.trim());
        }
        continue;
      }

      const requiresMatch = line.match(this.HEADER_FIELDS.REQUIRES_AT_LEAST);
      if (requiresMatch) {
        header.requiresAtLeast = requiresMatch[1].trim();
        continue;
      }

      const testedMatch = line.match(this.HEADER_FIELDS.TESTED_UP_TO);
      if (testedMatch) {
        header.testedUpTo = testedMatch[1].trim();
        continue;
      }

      const stableMatch = line.match(this.HEADER_FIELDS.STABLE_TAG);
      if (stableMatch) {
        header.stableTag = stableMatch[1].trim();
        continue;
      }

      const phpMatch = line.match(this.HEADER_FIELDS.REQUIRES_PHP);
      if (phpMatch) {
        header.requiresPHP = phpMatch[1].trim();
        continue;
      }

      const licenseMatch = line.match(this.HEADER_FIELDS.LICENSE);
      if (licenseMatch) {
        header.license = licenseMatch[1].trim();
        continue;
      }

      const licenseUriMatch = line.match(this.HEADER_FIELDS.LICENSE_URI);
      if (licenseUriMatch) {
        header.licenseURI = licenseUriMatch[1].trim();
        continue;
      }

      // Check for short description (non-empty line that's not a header field)
      if (line && 
          !this.isHeaderField(line) && 
          shortDescriptionStart === -1 && 
          header.pluginName) {
        shortDescriptionStart = i;
      }
    }

    // Extract short description
    if (shortDescriptionStart !== -1) {
      const descriptionLines = [];
      for (let i = shortDescriptionStart; i < (headerEnd !== -1 ? headerEnd : lines.length); i++) {
        const line = lines[i].trim();
        if (line && !this.isHeaderField(line)) {
          descriptionLines.push(line);
        } else if (descriptionLines.length > 0) {
          break;
        }
      }
      header.shortDescription = descriptionLines.join(' ');
    }

    // Set defaults for required fields
    return {
      pluginName: header.pluginName || '',
      contributors: header.contributors || [],
      tags: header.tags || [],
      requiresAtLeast: header.requiresAtLeast || '',
      testedUpTo: header.testedUpTo || '',
      stableTag: header.stableTag || '',
      license: header.license || '',
      shortDescription: header.shortDescription || '',
      donateLink: header.donateLink,
      requiresPHP: header.requiresPHP,
      licenseURI: header.licenseURI
    };
  }

  private static isHeaderField(line: string): boolean {
    return Object.values(this.HEADER_FIELDS).some(regex => regex.test(line));
  }

  private static parseSections(lines: string[]): ReadmeSection[] {
    const sections: ReadmeSection[] = [];
    let currentSection: Partial<ReadmeSection> | null = null;
    let contentLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const sectionMatch = line.match(this.SECTION_HEADER);

      if (sectionMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = contentLines.join('\n').trim();
          currentSection.lineEnd = i - 1;
          sections.push(currentSection as ReadmeSection);
        }

        // Start new section
        currentSection = {
          title: sectionMatch[1].trim(),
          level: 2, // WordPress readme sections are level 2
          lineStart: i
        };
        contentLines = [];
      } else if (currentSection) {
        contentLines.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      currentSection.content = contentLines.join('\n').trim();
      currentSection.lineEnd = lines.length - 1;
      sections.push(currentSection as ReadmeSection);
    }

    return sections;
  }

  private static validateParsedContent(result: ParsedReadme): void {
    const { header } = result;

    // Required field validation
    if (!header.pluginName) {
      result.errors.push('Plugin name is required (=== Plugin Name ===)');
    }

    if (!header.contributors || header.contributors.length === 0) {
      result.errors.push('Contributors field is required');
    }

    if (!header.tags || header.tags.length === 0) {
      result.errors.push('Tags field is required');
    } else if (header.tags.length > 5) {
      result.warnings.push('Maximum 5 tags recommended');
    }

    if (!header.requiresAtLeast) {
      result.errors.push('Requires at least field is required');
    }

    if (!header.testedUpTo) {
      result.errors.push('Tested up to field is required');
    }

    if (!header.stableTag) {
      result.errors.push('Stable tag field is required');
    }

    if (!header.license) {
      result.errors.push('License field is required');
    }

    if (!header.shortDescription) {
      result.errors.push('Short description is required');
    } else if (header.shortDescription.length > 150) {
      result.warnings.push('Short description should be 150 characters or less');
    }

    // Version format validation
    if (header.requiresAtLeast && !/^\d+\.\d+(\.\d+)?$/.test(header.requiresAtLeast)) {
      result.warnings.push('Requires at least should be in format X.Y or X.Y.Z');
    }

    if (header.testedUpTo && !/^\d+\.\d+(\.\d+)?$/.test(header.testedUpTo)) {
      result.warnings.push('Tested up to should be in format X.Y or X.Y.Z');
    }

    if (header.stableTag && !/^\d+\.\d+(\.\d+)?$/.test(header.stableTag)) {
      result.warnings.push('Stable tag should be in format X.Y or X.Y.Z');
    }

    if (header.requiresPHP && !/^\d+\.\d+(\.\d+)?$/.test(header.requiresPHP)) {
      result.warnings.push('Requires PHP should be in format X.Y or X.Y.Z');
    }
  }
}