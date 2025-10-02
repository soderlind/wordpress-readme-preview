import * as vscode from 'vscode';
import { ReadmeParser, ParsedReadme } from '../parser/readmeParser';
import { ReadmeValidator, ValidationResult } from '../parser/validator';
import { HtmlGenerator } from './htmlGenerator';

export class ReadmePreviewProvider {
  public static readonly viewType = 'wordpress-readme-preview';
  private static readonly panelTitle = 'WordPress Readme Preview';

  private panels = new Map<string, vscode.WebviewPanel>();
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly htmlGenerator: HtmlGenerator
  ) {
    // Listen for active editor changes
    vscode.window.onDidChangeActiveTextEditor(
      this.onActiveEditorChanged,
      this,
      this.disposables
    );

    // Listen for document changes
    vscode.workspace.onDidChangeTextDocument(
      this.onDocumentChanged,
      this,
      this.disposables
    );
  }

  public async showPreview(uri?: vscode.Uri, sideBySide: boolean = false): Promise<void> {
    const resource = uri || vscode.window.activeTextEditor?.document.uri;
    if (!resource) {
      return;
    }

    const document = await vscode.workspace.openTextDocument(resource);
    if (!this.isReadmeFile(document)) {
      vscode.window.showWarningMessage('This command can only be used with readme.txt files.');
      return;
    }

    const panel = this.getOrCreatePreviewPanel(resource, sideBySide);
    await this.updatePreview(panel, document);
  }

  private getOrCreatePreviewPanel(resource: vscode.Uri, sideBySide: boolean): vscode.WebviewPanel {
    const key = resource.toString();
    let panel = this.panels.get(key);

    if (panel) {
      panel.reveal(sideBySide ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active);
      return panel;
    }

    panel = vscode.window.createWebviewPanel(
      ReadmePreviewProvider.viewType,
      this.getPreviewTitle(resource),
      sideBySide ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'media'),
          vscode.Uri.joinPath(this.context.extensionUri, 'out', 'preview')
        ]
      }
    );

    // Set the panel icon
    panel.iconPath = {
      light: vscode.Uri.joinPath(this.context.extensionUri, 'media', 'preview-light.svg'),
      dark: vscode.Uri.joinPath(this.context.extensionUri, 'media', 'preview-dark.svg')
    };

    // Handle panel disposal
    panel.onDidDispose(() => {
      this.panels.delete(key);
    }, null, this.disposables);

    // Handle view state changes
    panel.onDidChangeViewState(e => {
      if (e.webviewPanel.visible) {
        const document = vscode.workspace.textDocuments.find(doc => 
          doc.uri.toString() === key
        );
        if (document && panel) {
          this.updatePreview(panel, document);
        }
      }
    }, null, this.disposables);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      message => this.handleWebviewMessage(message, resource),
      null,
      this.disposables
    );

    // Handle scroll synchronization
    this.setupScrollSync(panel, resource);

    this.panels.set(key, panel);
    return panel;
  }

  private async updatePreview(panel: vscode.WebviewPanel, document: vscode.TextDocument): Promise<void> {
    try {
      const content = document.getText();
      const parsed = ReadmeParser.parse(content);
      const validation = ReadmeValidator.validate(parsed);
      
      const html = await this.htmlGenerator.generateHtml(parsed, validation, {
        resource: document.uri,
        webview: panel.webview,
        extensionUri: this.context.extensionUri
      });

      panel.webview.html = html;
      
      // Update panel title to show validation status
      const validationIcon = validation.isValid ? '✅' : validation.errors.length > 0 ? '❌' : '⚠️';
      panel.title = `${validationIcon} ${this.getPreviewTitle(document.uri)}`;

    } catch (error) {
      console.error('Error updating preview:', error);
      panel.webview.html = this.getErrorHtml(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private handleWebviewMessage(message: any, resource: vscode.Uri): void {
    switch (message.command) {
      case 'openFile':
        vscode.window.showTextDocument(resource);
        break;
      case 'validate':
        this.validateAndShowResults(resource);
        break;
      case 'scrollToLine':
        this.scrollToLine(resource, message.line);
        break;
      case 'syncEditorScroll':
        this.syncEditorScroll(resource, message.scrollPercentage);
        break;
      case 'openLink':
        if (message.url) {
          vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
        break;
    }
  }

  private async validateAndShowResults(resource: vscode.Uri): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(resource);
      const content = document.getText();
      const parsed = ReadmeParser.parse(content);
      const validation = ReadmeValidator.validate(parsed);

      if (validation.isValid) {
        vscode.window.showInformationMessage(
          `✅ Readme validation passed! Score: ${validation.score}/100`
        );
      } else {
        const errorCount = validation.errors.filter(e => e.type === 'error').length;
        const warningCount = validation.warnings.length;
        
        vscode.window.showWarningMessage(
          `⚠️ Readme has ${errorCount} errors and ${warningCount} warnings. Score: ${validation.score}/100`
        );
      }

      // Show problems in Problems panel
      this.showProblemsInPanel(document, validation);

    } catch (error) {
      vscode.window.showErrorMessage(`Validation failed: ${error}`);
    }
  }

  private showProblemsInPanel(document: vscode.TextDocument, validation: ValidationResult): void {
    const diagnostics: vscode.Diagnostic[] = [];

    validation.errors.forEach(error => {
      const range = error.line 
        ? new vscode.Range(error.line - 1, 0, error.line - 1, 0)
        : new vscode.Range(0, 0, 0, 0);

      const diagnostic = new vscode.Diagnostic(
        range,
        error.message,
        error.type === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
      );

      diagnostic.source = 'WordPress Readme';
      if (error.suggestion) {
        diagnostic.relatedInformation = [
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(document.uri, range),
            `Suggestion: ${error.suggestion}`
          )
        ];
      }

      diagnostics.push(diagnostic);
    });

    // Create or get diagnostic collection
    const collection = vscode.languages.createDiagnosticCollection('wordpress-readme');
    collection.set(document.uri, diagnostics);
  }

  private async scrollToLine(resource: vscode.Uri, line: number): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(resource);
      const editor = await vscode.window.showTextDocument(document);
      
      const position = new vscode.Position(line - 1, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position));
    } catch (error) {
      console.error('Error scrolling to line:', error);
    }
  }

  private onActiveEditorChanged(editor: vscode.TextEditor | undefined): void {
    if (!editor || !this.isReadmeFile(editor.document)) {
      return;
    }

    // Auto-update preview if it exists and settings allow
    const config = vscode.workspace.getConfiguration('wordpress-readme');
    if (config.get('preview.autoOpen')) {
      this.showPreview(editor.document.uri);
    }

    // Update existing preview
    const key = editor.document.uri.toString();
    const panel = this.panels.get(key);
    if (panel && panel.visible) {
      this.updatePreview(panel, editor.document);
    }
  }

  private onDocumentChanged(event: vscode.TextDocumentChangeEvent): void {
    if (!this.isReadmeFile(event.document)) {
      return;
    }

    const key = event.document.uri.toString();
    const panel = this.panels.get(key);
    
    if (panel && panel.visible) {
      // Debounce updates to avoid excessive refreshing
      setTimeout(() => {
        this.updatePreview(panel, event.document);
      }, 300);
    }
  }

  private isReadmeFile(document: vscode.TextDocument): boolean {
    return document.languageId === 'readme-txt' || 
           document.fileName.toLowerCase().endsWith('readme.txt');
  }

  private getPreviewTitle(resource: vscode.Uri): string {
    const fileName = resource.path.split('/').pop() || 'readme.txt';
    return `Preview ${fileName}`;
  }

  private getErrorHtml(error: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Preview Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          .error {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 15px;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>Preview Error</h2>
          <p>Failed to generate preview: ${error}</p>
        </div>
      </body>
      </html>
    `;
  }

  private setupScrollSync(panel: vscode.WebviewPanel, resource: vscode.Uri): void {
    const config = vscode.workspace.getConfiguration('wordpress-readme');
    if (!config.get('preview.syncScrolling', true)) {
      return;
    }

    // Listen to editor scroll events
    const disposable = vscode.window.onDidChangeTextEditorVisibleRanges(event => {
      if (event.textEditor.document.uri.toString() === resource.toString()) {
        const scrollPercentage = this.calculateScrollPercentage(event.textEditor);
        panel.webview.postMessage({
          command: 'syncScroll',
          scrollPercentage: scrollPercentage
        });
      }
    });

    panel.onDidDispose(() => disposable.dispose(), null, this.disposables);
  }

  private calculateScrollPercentage(editor: vscode.TextEditor): number {
    const document = editor.document;
    const visibleRanges = editor.visibleRanges;
    
    if (visibleRanges.length === 0) {
      return 0;
    }

    const firstVisibleLine = visibleRanges[0].start.line;
    const totalLines = document.lineCount;
    
    return Math.min(firstVisibleLine / Math.max(totalLines - 1, 1), 1);
  }



  private syncEditorScroll(resource: vscode.Uri, scrollPercentage: number): void {
    const editor = vscode.window.visibleTextEditors.find(
      editor => editor.document.uri.toString() === resource.toString()
    );
    
    if (editor) {
      const document = editor.document;
      const targetLine = Math.floor(scrollPercentage * Math.max(document.lineCount - 1, 0));
      const range = new vscode.Range(targetLine, 0, targetLine, 0);
      
      editor.revealRange(range, vscode.TextEditorRevealType.AtTop);
    }
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.panels.forEach(panel => panel.dispose());
    this.panels.clear();
  }
}