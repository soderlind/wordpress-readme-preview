export interface MarkdownOptions {
  allowVideos: boolean;
  allowHTML: boolean;
  baseUrl?: string;
}

export class WordPressMarkdownParser {
  private static readonly VIDEO_PATTERNS = {
    YOUTUBE: /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
    VIMEO: /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/,
    VIDEOPRESS: /\[wpvideo\s+([^\]]+)\]/
  };

  private static readonly LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)(?:\s+"([^"]*)")?\)/g;
  private static readonly EMPHASIS_PATTERNS = {
    BOLD: /\*\*([^*]+)\*\*/g,
    ITALIC: /\*([^*]+)\*/g,
    CODE: /`([^`]+)`/g
  };

  public static parse(content: string, options: MarkdownOptions = { allowVideos: true, allowHTML: false }): string {
    let html = content;

    // Process line by line for better control
    const lines = html.split('\n');
    const processedLines = lines.map(line => this.processLine(line.trim(), options));
    
    html = processedLines.join('\n');

    // Process headers (H3-H6 only, as H1-H2 are handled at section level)
    html = this.processHeaders(html);

    // Process block-level elements
    html = this.processBlockquotes(html);
    html = this.processLists(html);
    html = this.processCodeBlocks(html);

    // Process inline elements
    html = this.processLinks(html);
    html = this.processEmphasis(html);

    // Process videos (if enabled)
    if (options.allowVideos) {
      html = this.processVideos(html);
    }

    return html;
  }

  private static processLine(line: string, options: MarkdownOptions): string {
    // Skip empty lines
    if (!line) {
      return '';
    }

    // Headers are handled by the main parser, so we don't process == headers here
    // This is for content within sections

    // Check for video URLs on their own line
    if (options.allowVideos && this.isVideoUrl(line)) {
      return this.convertVideoToEmbed(line);
    }

    return line;
  }

  private static processLinks(html: string): string {
    return html.replace(this.LINK_PATTERN, (match, text, url, title) => {
      const titleAttr = title ? ` title="${this.escapeHtml(title)}"` : '';
      const safeUrl = this.escapeHtml(url);
      const safeText = this.escapeHtml(text);
      return `<a href="${safeUrl}"${titleAttr}>${safeText}</a>`;
    });
  }

  private static processHeaders(html: string): string {
    // Process H3-H6 headers (H1-H2 are handled at section level)
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    
    return html;
  }

  private static processEmphasis(html: string): string {
    // Process code first to avoid conflicts with emphasis - need to escape HTML in code
    html = html.replace(this.EMPHASIS_PATTERNS.CODE, (match, code) => {
      return `<code>${this.escapeHtml(code)}</code>`;
    });
    // Process bold first (** before *)
    html = html.replace(this.EMPHASIS_PATTERNS.BOLD, '<strong>$1</strong>');
    html = html.replace(this.EMPHASIS_PATTERNS.ITALIC, '<em>$1</em>');
    
    return html;
  }

  private static processBlockquotes(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let inBlockquote = false;
    let blockquoteLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('> ')) {
        if (!inBlockquote) {
          inBlockquote = true;
          blockquoteLines = [];
        }
        blockquoteLines.push(line.substring(2));
      } else {
        if (inBlockquote) {
          result.push(`<blockquote>${blockquoteLines.join('<br>')}</blockquote>`);
          inBlockquote = false;
          blockquoteLines = [];
        }
        result.push(line);
      }
    }

    // Handle blockquote at end of content
    if (inBlockquote) {
      result.push(`<blockquote>${blockquoteLines.join('<br>')}</blockquote>`);
    }

    return result.join('\n');
  }

  private static processLists(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let inOrderedList = false;
    let inUnorderedList = false;
    let listItems: string[] = [];

    for (const line of lines) {
      const orderedMatch = line.match(/^(\d+)\.\s+(.+)$/);
      const unorderedMatch = line.match(/^[*-]\s+(.+)$/);

      if (orderedMatch) {
        if (inUnorderedList) {
          result.push(`<ul>${listItems.map(item => `<li>${item}</li>`).join('')}</ul>`);
          inUnorderedList = false;
          listItems = [];
        }
        if (!inOrderedList) {
          inOrderedList = true;
          listItems = [];
        }
        listItems.push(orderedMatch[2]);
      } else if (unorderedMatch) {
        if (inOrderedList) {
          result.push(`<ol>${listItems.map(item => `<li>${item}</li>`).join('')}</ol>`);
          inOrderedList = false;
          listItems = [];
        }
        if (!inUnorderedList) {
          inUnorderedList = true;
          listItems = [];
        }
        listItems.push(unorderedMatch[1]);
      } else {
        // End current list
        if (inOrderedList) {
          result.push(`<ol>${listItems.map(item => `<li>${item}</li>`).join('')}</ol>`);
          inOrderedList = false;
          listItems = [];
        }
        if (inUnorderedList) {
          result.push(`<ul>${listItems.map(item => `<li>${item}</li>`).join('')}</ul>`);
          inUnorderedList = false;
          listItems = [];
        }
        result.push(line);
      }
    }

    // Handle lists at end of content
    if (inOrderedList) {
      result.push(`<ol>${listItems.map(item => `<li>${item}</li>`).join('')}</ol>`);
    }
    if (inUnorderedList) {
      result.push(`<ul>${listItems.map(item => `<li>${item}</li>`).join('')}</ul>`);
    }

    return result.join('\n');
  }

  private static processCodeBlocks(html: string): string {
    // Handle fenced code blocks (```)
    const codeBlockPattern = /```([^`]*)```/gs;
    return html.replace(codeBlockPattern, (match, code) => {
      return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
    });
  }

  private static processVideos(html: string): string {
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
      const trimmedLine = line.trim();
      if (this.isVideoUrl(trimmedLine)) {
        return this.convertVideoToEmbed(trimmedLine);
      }
      return line;
    });

    return processedLines.join('\n');
  }

  private static isVideoUrl(url: string): boolean {
    return Object.values(this.VIDEO_PATTERNS).some(pattern => pattern.test(url));
  }

  private static convertVideoToEmbed(url: string): string {
    // YouTube
    const youtubeMatch = url.match(this.VIDEO_PATTERNS.YOUTUBE);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      return `<div class="video-embed youtube-embed">
        <iframe width="560" height="315" 
                src="https://www.youtube.com/embed/${videoId}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
        </iframe>
      </div>`;
    }

    // Vimeo
    const vimeoMatch = url.match(this.VIDEO_PATTERNS.VIMEO);
    if (vimeoMatch) {
      const videoId = vimeoMatch[1];
      return `<div class="video-embed vimeo-embed">
        <iframe width="560" height="315" 
                src="https://player.vimeo.com/video/${videoId}" 
                frameborder="0" 
                allow="autoplay; fullscreen; picture-in-picture" 
                allowfullscreen>
        </iframe>
      </div>`;
    }

    // VideoPress
    const videoPressMatch = url.match(this.VIDEO_PATTERNS.VIDEOPRESS);
    if (videoPressMatch) {
      return `<div class="video-embed videopress-embed">
        <p><em>VideoPress video: ${videoPressMatch[1]}</em></p>
      </div>`;
    }

    return url;
  }

  private static escapeHtml(text: string): string {
    const htmlEscapes: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    
    return text.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
  }

  /**
   * Convert paragraphs (double line breaks to <p> tags)
   */
  public static processParagraphs(html: string): string {
    // Split by double newlines to identify paragraphs
    const paragraphs = html.split(/\n\s*\n/);
    
    return paragraphs.map(paragraph => {
      const trimmed = paragraph.trim();
      if (!trimmed) {
        return '';
      }
      
      // Don't wrap block elements in paragraphs
      if (trimmed.startsWith('<div') || 
          trimmed.startsWith('<blockquote') || 
          trimmed.startsWith('<ul') || 
          trimmed.startsWith('<ol') || 
          trimmed.startsWith('<pre') ||
          trimmed.startsWith('<h')) {
        return trimmed;
      }
      
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).filter(p => p).join('\n\n');
  }
}