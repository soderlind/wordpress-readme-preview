// Simple script for the preview webview
(function() {
  'use strict';

  const vscode = acquireVsCodeApi();

  // Handle clicks on validation items to navigate to source
  document.addEventListener('click', function(event) {
    const target = event.target;
    
    // Handle validation item clicks
    if (target.classList.contains('validation-item') || target.closest('.validation-item')) {
      const item = target.closest('.validation-item');
      const line = item.dataset.line;
      
      if (line) {
        vscode.postMessage({
          command: 'scrollToLine',
          line: parseInt(line, 10)
        });
      }
    }
    
    // Handle external links
    if (target.tagName === 'A' && target.href && target.href.startsWith('http')) {
      event.preventDefault();
      vscode.postMessage({
        command: 'openExternalLink',
        url: target.href
      });
    }
  });

  // Handle validation button clicks
  const validateButton = document.querySelector('.validate-button');
  if (validateButton) {
    validateButton.addEventListener('click', function() {
      vscode.postMessage({
        command: 'validate'
      });
    });
  }

  // Handle edit source button clicks
  const editButton = document.querySelector('.edit-source-button');
  if (editButton) {
    editButton.addEventListener('click', function() {
      vscode.postMessage({
        command: 'openFile'
      });
    });
  }

  // Smooth scrolling for anchor links
  document.addEventListener('click', function(event) {
    const target = event.target;
    
    if (target.tagName === 'A' && target.getAttribute('href') && target.getAttribute('href').startsWith('#')) {
      event.preventDefault();
      const targetId = target.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + R to validate
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault();
      vscode.postMessage({
        command: 'validate'
      });
    }
    
    // Ctrl/Cmd + E to edit source
    if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
      event.preventDefault();
      vscode.postMessage({
        command: 'openFile'
      });
    }
  });

  // Handle theme changes
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        // Refresh styles if needed
        updateTheme();
      }
    });
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });

  function updateTheme() {
    // This function can be used to update theme-specific elements
    // Currently handled by CSS custom properties
  }

  // Initialize
  console.log('WordPress Readme Preview loaded');
})();