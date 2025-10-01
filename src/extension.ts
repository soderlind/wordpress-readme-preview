import * as vscode from 'vscode';
import { ReadmePreviewProvider } from './preview/previewProvider';
import { HtmlGenerator } from './preview/htmlGenerator';
import { ReadmeParser } from './parser/readmeParser';
import { ReadmeValidator } from './parser/validator';

export function activate(context: vscode.ExtensionContext) {
  console.log('WordPress Readme Preview extension activated');

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
      await validateReadmeFile(uri);
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
    statusBarItem,
    previewProvider
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

async function validateReadmeFile(uri?: vscode.Uri): Promise<void> {
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

function showDiagnostics(document: vscode.TextDocument, validation: any): void {
  const diagnostics: vscode.Diagnostic[] = [];
  const collection = vscode.languages.createDiagnosticCollection('wordpress-readme');

  validation.errors.forEach((error: any) => {
    const range = error.line 
      ? new vscode.Range(error.line - 1, 0, error.line - 1, 999)
      : new vscode.Range(0, 0, 0, 999);

    const diagnostic = new vscode.Diagnostic(
      range,
      error.message,
      error.type === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
    );

    diagnostic.source = 'WordPress Readme';
    diagnostics.push(diagnostic);
  });

  collection.set(document.uri, diagnostics);
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