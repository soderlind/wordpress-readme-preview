import * as vscode from 'vscode';
import { ParsedReadme, ReadmeHeader, ReadmeSection } from '../parser/readmeParser';
import { ValidationResult, ValidationError } from '../parser/validator';
import { WordPressMarkdownParser } from '../parser/markdownParser';

export interface HtmlGeneratorOptions {
  resource: vscode.Uri;
  webview: vscode.Webview;
  extensionUri: vscode.Uri;
  theme?: string;
  assets?: PluginAssets;
  syncScrolling?: boolean;
}

export interface PluginAssets {
  banner?: { large?: vscode.Uri; small?: vscode.Uri };
  icons?: { [size: string]: vscode.Uri };
  screenshots?: { index: number; uri: vscode.Uri; filename: string }[];
  assetDirs: vscode.Uri[];
}

export class HtmlGenerator {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public async generateHtml(
    readme: ParsedReadme, 
    validation: ValidationResult, 
    options: HtmlGeneratorOptions
  ): Promise<string> {
    // Store sections for later caption parsing (screenshots)
    (this as any).lastParsedReadmeSections = readme.sections;
    const { webview, extensionUri } = options;
    const theme = options.theme || 'classic';
    // Persist theme & raw assets for downstream helpers
    (this as any)._currentTheme = theme;
    (this as any)._rawAssets = options.assets;
    // Pre-convert asset URIs to webview URIs for safe embedding
    const processedAssets = this.processAssetsForWebview(options.assets, webview);
    (this as any)._currentAssets = processedAssets;
    
    // Get URIs for resources
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'out', 'preview', 'styles.css')
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'out', 'preview', 'script.js')
    );

    const nonce = this.getNonce();

    const rawHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
              style-src ${webview.cspSource} 'unsafe-inline'; 
              script-src 'nonce-${nonce}';
              img-src ${webview.cspSource} https: data:;
              media-src ${webview.cspSource} https:;">
        <title>WordPress Readme Preview</title>
        <link href="${styleUri}" rel="stylesheet">
        <script nonce="${nonce}">
          // Theme detection - must run immediately to prevent flashing
          (function() {
            const theme = document.body.getAttribute('data-vscode-theme-kind') || 
                         document.body.getAttribute('data-vscode-theme-name') || 
                         'vscode-light';
            document.documentElement.setAttribute('data-vscode-theme-kind', theme);
          })();
        </script>
      </head>
      <body>
  <div class="readme-preview theme-${theme}" data-sync-scrolling="${options.syncScrolling ? 'on' : 'off'}">
          ${theme === 'wordpress-org' 
            ? this.generateTabbedLayout(readme, validation, processedAssets) 
            : `${this.generateValidationSummary(validation)}${this.generateHeader(readme.header, validation)}${this.generateSections(readme.sections)}`}
        </div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;
    // Post-process relative <img> paths for classic or tabbed content
    return this.rewriteRelativeImageSources(rawHtml, options);
  }

  private processAssetsForWebview(assets: PluginAssets | undefined, webview: vscode.Webview): PluginAssets | undefined {
    if (!assets) return undefined;
    const clone: PluginAssets = { assetDirs: assets.assetDirs, screenshots: [], icons: {} };
    if (assets.banner) {
      clone.banner = { };
      if (assets.banner.large) clone.banner.large = webview.asWebviewUri(assets.banner.large);
      if (assets.banner.small) clone.banner.small = webview.asWebviewUri(assets.banner.small);
    }
    if (assets.icons) {
      for (const k of Object.keys(assets.icons)) {
        clone.icons![k] = webview.asWebviewUri(assets.icons[k]);
      }
    }
    if (assets.screenshots) {
      clone.screenshots = assets.screenshots.map(s => ({ ...s, uri: webview.asWebviewUri(s.uri) }));
    }
    return clone;
  }

  private generateTabbedLayout(readme: ParsedReadme, validation: ValidationResult, assets?: PluginAssets): string {
    // Tabs no longer include separate screenshots; gallery appended to Description panel
    const tabs = [
      { id: 'description', title: 'Description' },
      { id: 'installation', title: 'Installation' },
      { id: 'faq', title: 'FAQ' },
      { id: 'changelog', title: 'Changelog' }
    ];

    // Map readme sections to tab panels by simple title matching
    const sectionMap: { [key: string]: string } = {};
    for (const section of readme.sections) {
      const key = section.title.toLowerCase();
      sectionMap[key] = this.generateSection(section);
    }

    // Asset header
    const headerHTML = this.generateHeader(readme.header, validation);
    const bannerHTML = this.renderAssetsHeader(assets, readme.header.pluginName || '');

    const tabButtons = tabs.map((t, i) => `<button role="tab" class="wporg-tab ${i===0?'active':''}" aria-selected="${i===0}" aria-controls="panel-${t.id}" id="tab-${t.id}">${t.title}</button>`).join('');
    const panels = tabs.map((t, i) => {
      let content = '';
      if (sectionMap[t.title.toLowerCase()]) {
        let sectionHtml = sectionMap[t.title.toLowerCase()] || '';
        if (t.id === 'description' && assets?.screenshots && assets.screenshots.length) {
          // Append screenshots gallery with anchor for hash #screenshots
          sectionHtml += `<div id="screenshots" class="screenshots-anchor"></div>${this.renderScreenshots(assets)}`;
        }
        content = sectionHtml;
      } else {
        content = '<div class="tab-placeholder">No content for this section.</div>';
      }
      return `<div role="tabpanel" id="panel-${t.id}" class="wporg-tabpanel ${i===0?'active':''}" aria-labelledby="tab-${t.id}">${content}</div>`;
    }).join('');

    return `
      <div class="wporg-header">
        ${bannerHTML}
        <div class="wporg-header-inner">
          ${headerHTML}
        </div>
      </div>
      ${this.generateValidationSummary(validation)}
      <div class="wporg-tabs" role="tablist">
        ${tabButtons}
      </div>
      <div class="wporg-tabpanels">
        ${panels}
      </div>
    `;
  }

  private renderAssetsHeader(assets: PluginAssets | undefined, pluginName: string): string {
    if (!assets || (!assets.banner && (!assets.icons || Object.keys(assets.icons).length === 0))) {
      return '';
    }
  const bannerUri = (assets.banner?.large || assets.banner?.small)?.toString();
  const iconUri = this.pickBestIcon(assets.icons)?.toString();
    const bannerImg = bannerUri ? `<img class="wporg-banner" src="${bannerUri}" alt="${this.escapeHtml(pluginName)} banner" />` : '';
    const iconImg = iconUri ? `<img class="wporg-icon" src="${iconUri}" alt="${this.escapeHtml(pluginName)} icon" />` : '';
    return `<div class="wporg-asset-header">${bannerImg}${iconImg}</div>`;
  }

  private pickBestIcon(icons: { [size: string]: vscode.Uri } | undefined): vscode.Uri | undefined {
    if (!icons) return undefined;
    const preferred = ['256','128','64','32'];
    for (const p of preferred) {
      if (icons[p]) return icons[p];
    }
    const sizes = Object.keys(icons);
    if (sizes.length) return icons[sizes[0]];
    return undefined;
  }

  private renderScreenshots(assets: PluginAssets | undefined): string {
    if (!assets || !assets.screenshots || assets.screenshots.length === 0) {
      return '<div class="tab-placeholder">No screenshots found.</div>';
    }
    // Attempt to locate a Screenshots section to parse captions
    const screenshotsSection = (this as any).lastParsedReadmeSections as ReadmeSection[] | undefined; // fallback if stored
    let captions: { [index: number]: string } = {};
    if (screenshotsSection) {
      const section = screenshotsSection.find(s => s.title.toLowerCase() === 'screenshots');
      if (section) {
        // Lines like '1. First screenshot description'
        const lines = section.content.split(/\r?\n/);
        for (const line of lines) {
          const match = line.match(/^(\d+)\.\s+(.+?)\s*$/);
          if (match) {
            const idx = parseInt(match[1], 10);
            captions[idx] = match[2];
          }
        }
      }
    }
    // If no captions parsed at all, hide gallery entirely per requirement
    if (Object.keys(captions).length === 0) {
      return '';
    }
    const items = assets.screenshots.map((s, idx) => {
      const caption = captions[s.index] ? this.escapeHtml(captions[s.index]) : `Screenshot ${s.index}`;
      const src = s.uri.toString();
      return `<figure class="wporg-screenshot" data-index="${idx}"><button class="screenshot-thumb" aria-label="Open screenshot ${s.index}"><img src="${src}" alt="${caption}" /></button><figcaption>${caption}</figcaption></figure>`;
    }).join('');
    // Lightbox container appended (hidden by default) once per gallery
    const lightbox = `
      <div class="wporg-gallery-lightbox" role="dialog" aria-modal="true" aria-label="Screenshot gallery" hidden>
        <div class="wporg-gallery-backdrop" data-action="close"></div>
        <div class="wporg-gallery-content">
          <button class="gallery-close" data-action="close" aria-label="Close gallery">×</button>
          <button class="gallery-nav prev" data-action="prev" aria-label="Previous screenshot">‹</button>
          <button class="gallery-nav next" data-action="next" aria-label="Next screenshot">›</button>
          <figure class="gallery-current">
            <img class="gallery-image" alt="" />
            <figcaption class="gallery-caption"></figcaption>
          </figure>
          <div class="gallery-counter" aria-live="polite"></div>
        </div>
      </div>`;
    return `<div class="wporg-screenshots" data-gallery>${items}</div>${lightbox}`;
  }

  private generateValidationSummary(validation: ValidationResult): string {
    const errorCount = validation.errors.filter(e => e.type === 'error').length;
    const warningCount = validation.warnings.length;
    
    let statusClass = 'success';
    let statusIcon = '✅';
    let statusText = 'Valid';
    
    if (errorCount > 0) {
      statusClass = 'error';
      statusIcon = '❌';
      statusText = `${errorCount} Error${errorCount !== 1 ? 's' : ''}`;
    } else if (warningCount > 0) {
      statusClass = 'warning';
      statusIcon = '⚠️';
      statusText = `${warningCount} Warning${warningCount !== 1 ? 's' : ''}`;
    }

    return `
      <div class="validation-summary ${statusClass}">
        <div class="validation-status">
          <span class="status-icon">${statusIcon}</span>
          <span class="status-text">${statusText}</span>
          <span class="score">Score: ${validation.score}/100</span>
        </div>
        ${validation.errors.length > 0 ? this.generateValidationDetails(validation.errors) : ''}
      </div>
    `;
  }

  private generateValidationDetails(errors: ValidationError[]): string {
    const errorItems = errors.map(error => `
      <div class="validation-item ${error.type}">
        <div class="validation-message">
          ${this.escapeHtml(error.message)}
          ${error.field ? `<span class="field-name">(${error.field})</span>` : ''}
        </div>
        ${error.suggestion ? `<div class="validation-suggestion">→ ${this.escapeHtml(error.suggestion)}</div>` : ''}
      </div>
    `).join('');

    return `
      <div class="validation-details">
        <details>
          <summary>Show Details</summary>
          <div class="validation-items">
            ${errorItems}
          </div>
        </details>
      </div>
    `;
  }

  private generateHeader(header: ReadmeHeader, validation: ValidationResult): string {
    const hasErrors = validation.errors.some(e => e.field);
    
    return `
      <div class="plugin-header ${hasErrors ? 'has-errors' : ''}">
        <h1 class="plugin-name">${this.escapeHtml(header.pluginName || 'Untitled Plugin')}</h1>
        
        <div class="plugin-meta">
          <div class="meta-row">
            <div class="meta-item">
              <label>Contributors:</label>
              <span>${this.generateContributors(header.contributors)}</span>
            </div>
            ${header.donateLink ? `
              <div class="meta-item">
                <label>Donate:</label>
                <a href="${this.escapeHtml(header.donateLink)}" target="_blank">Support this plugin</a>
              </div>
            ` : ''}
          </div>
          
          <div class="meta-row">
            <div class="meta-item">
              <label>Tags:</label>
              <span class="tags">${this.generateTags(header.tags)}</span>
            </div>
          </div>
          
          <div class="meta-row">
            <div class="meta-item">
              <label>Requires at least:</label>
              <span>${this.escapeHtml(header.requiresAtLeast || 'N/A')}</span>
            </div>
            <div class="meta-item">
              <label>Tested up to:</label>
              <span>${this.escapeHtml(header.testedUpTo || 'N/A')}</span>
            </div>
            <div class="meta-item">
              <label>Stable tag:</label>
              <span>${this.escapeHtml(header.stableTag || 'N/A')}</span>
            </div>
          </div>
          
          ${header.requiresPHP ? `
            <div class="meta-row">
              <div class="meta-item">
                <label>Requires PHP:</label>
                <span>${this.escapeHtml(header.requiresPHP)}</span>
              </div>
            </div>
          ` : ''}
          
          <div class="meta-row">
            <div class="meta-item">
              <label>License:</label>
              <span>
                ${header.licenseURI ? 
                  `<a href="${this.escapeHtml(header.licenseURI)}" target="_blank">${this.escapeHtml(header.license || 'N/A')}</a>` :
                  this.escapeHtml(header.license || 'N/A')
                }
              </span>
            </div>
          </div>
        </div>
        
        ${header.shortDescription ? `
          <div class="short-description">
            ${this.escapeHtml(header.shortDescription)}
          </div>
        ` : ''}
      </div>
    `;
  }

  private generateContributors(contributors: string[]): string {
    if (!contributors || contributors.length === 0) {
      return '<span class="missing">No contributors listed</span>';
    }
    
    return contributors.map(contributor => 
      `<a href="https://profiles.wordpress.org/${encodeURIComponent(contributor.trim())}" target="_blank" class="contributor">${this.escapeHtml(contributor.trim())}</a>`
    ).join(', ');
  }

  private generateTags(tags: string[]): string {
    if (!tags || tags.length === 0) {
      return '<span class="missing">No tags</span>';
    }
    
    return tags.map(tag => 
      `<span class="tag">${this.escapeHtml(tag.trim())}</span>`
    ).join(' ');
  }

  private generateSections(sections: ReadmeSection[]): string {
    if (!sections || sections.length === 0) {
      return '<div class="no-sections">No sections found</div>';
    }

    // Filter out sections that contain header information
    const contentSections = sections.filter(section => {
      // Skip sections that are just the plugin name
      if (section.title === 'Plugin Name') {
        return false;
      }
      
      // Skip sections that contain header-like content (Contributors:, Tags:, etc.)
      const content = section.content.toLowerCase();
      const hasHeaderFields = content.includes('contributors:') && 
                             content.includes('donate link:') && 
                             content.includes('tags:');
      
      return !hasHeaderFields;
    });

    return contentSections.map(section => this.generateSection(section)).join('');
  }

  private generateSection(section: ReadmeSection): string {
    const sectionId = this.generateSectionId(section.title);
    // Define canonical alias IDs that tabbed theme expects
    const canonicalIds: { [key: string]: string } = {
      'description': 'description',
      'installation': 'installation',
      'faq': 'faq',
      'frequently-asked-questions': 'faq',
      'screenshots': 'screenshots',
      'changelog': 'changelog'
    };
    const aliasId = canonicalIds[sectionId];
    
    // Process FAQ questions (= Question =) as H3 headers
    let processedContent = section.content;
    
    // Convert FAQ questions to proper headers
    processedContent = processedContent.replace(/^=\s*(.+?)\s*=$/gm, '### $1');
    
    // Parse markdown
    processedContent = WordPressMarkdownParser.parse(processedContent, {
      allowVideos: true,
      allowHTML: false
    });
    
    let finalContent = WordPressMarkdownParser.processParagraphs(processedContent);
    // If classic theme and this is the screenshots section, append inline gallery
    const theme = (this as any)._currentTheme as string;
    const assets = (this as any)._currentAssets as PluginAssets | undefined;
    if (theme === 'classic' && sectionId === 'screenshots' && assets?.screenshots && assets.screenshots.length) {
      finalContent += this.renderScreenshots(assets);
    }

    return `
      <div class="readme-section" id="${sectionId}">
        ${aliasId && aliasId !== sectionId ? `<span id="${aliasId}" class="section-alias"></span>` : ''}
        <h2 class="section-title">${this.escapeHtml(section.title)}</h2>
        <div class="section-content">
          ${finalContent}
        </div>
      </div>
    `;
  }

  private generateSectionId(title: string): string {
    return title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private escapeHtml(text: string): string {
    const htmlEscapes: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    
    return text.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private rewriteRelativeImageSources(html: string, options: HtmlGeneratorOptions): string {
    const baseDir = vscode.Uri.joinPath(options.resource, '..');
    return html.replace(/<img\s+[^>]*src=("|')(?!https?:|data:|vscode-resource:|file:)([^"']+?)\1[^>]*>/gi, (match, quote, src) => {
      // Ignore absolute root-like paths starting with //
      if (src.startsWith('//')) return match;
      try {
        const target = vscode.Uri.joinPath(baseDir, src);
        const webviewUri = options.webview.asWebviewUri(target).toString();
        return match.replace(`src=${quote}${src}${quote}`, `src=${quote}${webviewUri}${quote}`);
      } catch {
        return match; // fallback on failure
      }
    });
  }
}