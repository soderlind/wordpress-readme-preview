import * as vscode from 'vscode';
import { ReadmePreviewProvider } from './preview/previewProvider';
import { HtmlGenerator } from './preview/htmlGenerator';
import { ReadmeParser } from './parser/readmeParser';
import { ReadmeValidator } from './parser/validator';

export function activate(context: vscode.ExtensionContext) {
  console.log('WordPress Readme Preview extension activated');

  // Create output channel for debugging
  const outputChannel = vscode.window.createOutputChannel('WordPress Readme Debug');
  context.subscriptions.push(outputChannel);

  // Create HTML generator and preview provider
  const htmlGenerator = new HtmlGenerator(context);
  const previewProvider = new ReadmePreviewProvider(context, htmlGenerator);

  // Register commands
  const showPreviewCommand = vscode.commands.registerCommand(
    'wordpress-readme.showPreview',
    async (uri?: vscode.Uri) => {
      await previewProvider.showPreview(uri, false);
    }
  );

  const showPreviewToSideCommand = vscode.commands.registerCommand(
    'wordpress-readme.showPreviewToSide',
    async (uri?: vscode.Uri) => {
      await previewProvider.showPreview(uri, true);
    }
  );

  const validateReadmeCommand = vscode.commands.registerCommand(
    'wordpress-readme.validateReadme',
    async (uri?: vscode.Uri) => {
      await validateReadmeFile(uri, outputChannel);
    }
  );

  // Register text document content provider for custom scheme if needed
  const documentProvider = new ReadmeDocumentProvider();
  const documentProviderRegistration = vscode.workspace.registerTextDocumentContentProvider(
    'wordpress-readme',
    documentProvider
  );

  // Auto-open preview when readme.txt files are opened (if enabled in settings)
  const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(async (document: vscode.TextDocument) => {
    if (isReadmeFile(document)) {
      const config = vscode.workspace.getConfiguration('wordpress-readme');
      if (config.get('preview.autoOpen')) {
        await previewProvider.showPreview(document.uri, true);
      }
    }
  });

  // Register language configuration
  const readmeLanguageConfig = vscode.languages.setLanguageConfiguration('readme-txt', {
    comments: {
      lineComment: '#'
    },
    brackets: [
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' }
    ]
  });

  // Completion provider for section headings after '==' at start of line
  const SECTION_HEADINGS = [
    'Description',
    'Installation',
    'Frequently Asked Questions',
    'Screenshots',
    'Changelog',
    'Upgrade Notice'
  ];

  const sectionCompletionProvider = vscode.languages.registerCompletionItemProvider(
    { language: 'readme-txt', scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const line = document.lineAt(position).text;
        const prefix = line.substring(0, position.character);
        // Trigger only if line starts with optional whitespace then '==' and no closing '==' yet
        const match = prefix.match(/^\s*==\s?(.*)$/);
        if (!match) {
          return undefined;
        }
        // If closing '==' already present, do not offer
        if (/==\s.*==/.test(line)) {
          return undefined;
        }
        
        // Check if we already have opening '==' - if so, only insert name and closing ==
        const hasOpeningEquals = prefix.includes('==');
        
        return SECTION_HEADINGS.map(h => {
          const item = new vscode.CompletionItem(h, vscode.CompletionItemKind.Module);
          if (hasOpeningEquals) {
            // User already typed '==', just insert ' SectionName =='
            item.insertText = ` ${h} ==`;
          } else {
            // Insert full format
            item.insertText = `== ${h} ==`;
          }
          item.detail = 'WordPress readme section';
          item.sortText = '0_' + h;
          return item;
        });
      },
    }, ' '
  );

  // Add status bar item
  const statusBarItem = createStatusBarItem();
  updateStatusBarItem(statusBarItem);

  // Listen for active editor changes to update status bar
  const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(() => {
    updateStatusBarItem(statusBarItem);
  });

  // Listen for document changes to update validation
  const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
    if (isReadmeFile(event.document)) {
      updateStatusBarItem(statusBarItem);
      // Debounced validation
      debounceValidation(event.document);
    }
  });

  // Register all disposables
  context.subscriptions.push(
    showPreviewCommand,
    showPreviewToSideCommand,
    validateReadmeCommand,
    documentProviderRegistration,
    onDidOpenTextDocument,
    onDidChangeActiveTextEditor,
    onDidChangeTextDocument,
    readmeLanguageConfig,
    sectionCompletionProvider,
    statusBarItem,
    previewProvider,
    diagnosticCollection
  );

  // Show welcome message for first-time users
  showWelcomeMessage(context);
}

export function deactivate() {
  console.log('WordPress Readme Preview extension deactivated');
}

class ReadmeDocumentProvider implements vscode.TextDocumentContentProvider {
  onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this.onDidChangeEmitter.event;

  provideTextDocumentContent(uri: vscode.Uri): string {
    // This could be used for providing template content or examples
    return `=== WordPress Plugin Name ===
Contributors: your-username
Tags: wordpress, plugin
Requires at least: 5.0
Tested up to: 6.3
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Short description of your plugin (150 characters max).

== Description ==

Detailed description of your plugin goes here.

== Installation ==

1. Upload the plugin files to \`/wp-content/plugins/\` directory
2. Activate the plugin through the 'Plugins' screen in WordPress

== Frequently Asked Questions ==

= How do I use this plugin? =

Answer to the question.

== Screenshots ==

1. This screen shot description corresponds to screenshot-1.png

== Changelog ==

= 1.0.0 =
* Initial release
`;
  }
}

async function validateReadmeFile(uri?: vscode.Uri, outputChannel?: vscode.OutputChannel): Promise<void> {
  const resource = uri || vscode.window.activeTextEditor?.document.uri;
  if (!resource) {
    vscode.window.showWarningMessage('No readme.txt file is currently open.');
    return;
  }

  try {
    const document = await vscode.workspace.openTextDocument(resource);
    if (!isReadmeFile(document)) {
      vscode.window.showWarningMessage('This command can only be used with readme.txt files.');
      return;
    }

    const content = document.getText();
    const parsed = ReadmeParser.parse(content);
    const validation = ReadmeValidator.validate(parsed);
    
    // Test the exact parsing logic
    const lines = content.split('\n');
    const contributorsLine = lines[1].trim(); // "Contributors: PerS"
    


    // Show validation results
    const errorCount = validation.errors.filter(e => e.type === 'error').length;
    const warningCount = validation.warnings.length;

    if (validation.isValid) {
      vscode.window.showInformationMessage(
        `✅ Readme validation passed! Score: ${validation.score}/100`
      );
    } else {
      const message = `Validation found ${errorCount} error${errorCount !== 1 ? 's' : ''} and ${warningCount} warning${warningCount !== 1 ? 's' : ''}. Score: ${validation.score}/100`;
      
      if (errorCount > 0) {
        vscode.window.showErrorMessage(message);
      } else {
        vscode.window.showWarningMessage(message);
      }
    }

    // Show diagnostics in Problems panel
    showDiagnostics(document, validation);

  } catch (error) {
    vscode.window.showErrorMessage(`Validation failed: ${error}`);
  }
}

// Create diagnostic collection once and reuse it
const diagnosticCollection = vscode.languages.createDiagnosticCollection('wordpress-readme');

function showDiagnostics(document: vscode.TextDocument, validation: any): void {
  const diagnostics: vscode.Diagnostic[] = [];

  validation.errors.forEach((error: any) => {
    // Use actual line number if available, otherwise default to line 1
    const lineNumber = error.line ? error.line - 1 : 0;
    const lineLength = document.lineAt(lineNumber).text.length;
    
    // Use column information if available for precise positioning
    const startColumn = error.column || 0;
    const endColumn = error.endColumn || Math.max(lineLength, 1);
    
    const range = new vscode.Range(
      lineNumber, 
      startColumn, 
      lineNumber, 
      endColumn
    );

    const diagnostic = new vscode.Diagnostic(
      range,
      error.message,
      error.type === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
    );

    diagnostic.source = 'WordPress Readme';
    diagnostics.push(diagnostic);
  });

  // Replace all diagnostics for this file (not append)
  diagnosticCollection.set(document.uri, diagnostics);
}

function isReadmeFile(document: vscode.TextDocument): boolean {
  return document.languageId === 'readme-txt' || 
         document.fileName.toLowerCase().endsWith('readme.txt');
}

function createStatusBarItem(): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'wordpress-readme.validateReadme';
  statusBarItem.tooltip = 'Click to validate readme.txt';
  return statusBarItem;
}

function updateStatusBarItem(statusBarItem: vscode.StatusBarItem): void {
  const activeEditor = vscode.window.activeTextEditor;
  
  if (activeEditor && isReadmeFile(activeEditor.document)) {
    // Quick validation for status bar
    try {
      const content = activeEditor.document.getText();
      const parsed = ReadmeParser.parse(content);
      const validation = ReadmeValidator.validate(parsed);
      
      const errorCount = validation.errors.filter(e => e.type === 'error').length;
      const warningCount = validation.warnings.length;
      
      if (validation.isValid) {
        statusBarItem.text = `$(check) Readme: ${validation.score}/100`;
        statusBarItem.backgroundColor = undefined;
      } else if (errorCount > 0) {
        statusBarItem.text = `$(error) Readme: ${errorCount} errors`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      } else {
        statusBarItem.text = `$(warning) Readme: ${warningCount} warnings`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      }
      
      statusBarItem.show();
    } catch (error) {
      statusBarItem.text = '$(error) Readme: Parse error';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      statusBarItem.show();
    }
  } else {
    statusBarItem.hide();
  }
}

let validationTimeout: any | undefined;

function debounceValidation(document: vscode.TextDocument): void {
  if (validationTimeout) {
    clearTimeout(validationTimeout);
  }
  
  validationTimeout = setTimeout(() => {
    // Auto-validation in background
    try {
      const content = document.getText();
      const parsed = ReadmeParser.parse(content);
      const validation = ReadmeValidator.validate(parsed);
      showDiagnostics(document, validation);
    } catch (error) {
      console.error('Auto-validation error:', error);
    }
  }, 1000);
}

async function showWelcomeMessage(context: vscode.ExtensionContext): Promise<void> {
  const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
  
  if (!hasShownWelcome) {
    const action = await vscode.window.showInformationMessage(
      'Welcome to WordPress Readme Preview! This extension helps you create and validate WordPress plugin readme.txt files.',
      'Learn More',
      'Create Template',
      'Don\'t Show Again'
    );
    
    switch (action) {
      case 'Learn More':
        vscode.env.openExternal(vscode.Uri.parse('https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/'));
        break;
      case 'Create Template':
        await createReadmeTemplate();
        break;
    }
    
    if (action === 'Don\'t Show Again' || action) {
      await context.globalState.update('hasShownWelcome', true);
    }
  }
}

async function createReadmeTemplate(): Promise<void> {
  const templateUri = vscode.Uri.parse('wordpress-readme:template.txt');
  const doc = await vscode.workspace.openTextDocument(templateUri);
  await vscode.window.showTextDocument(doc);
}