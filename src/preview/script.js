// Simple script for the preview webview
(function() {
  'use strict';

  const vscode = acquireVsCodeApi();
  let isScrollingSynced = false;
  let scrollTimeout;

  // Handle messages from the extension
  window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.command) {
      case 'syncScroll':
        syncPreviewScroll(message.scrollPercentage);
        break;
    }
  });

  // Sync preview scroll position based on editor scroll
  function syncPreviewScroll(scrollPercentage) {
    isScrollingSynced = true;
    
    const scrollableHeight = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      0
    );
    const targetScrollTop = scrollPercentage * scrollableHeight;
    
    window.scrollTo({
      top: targetScrollTop,
      behavior: 'auto'
    });

    // Reset sync flag after a short delay
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isScrollingSynced = false;
    }, 100);
  }

  // Handle scroll synchronization from preview to editor
  window.addEventListener('scroll', () => {
    if (isScrollingSynced) {
      return; // Don't sync back while we're syncing from editor
    }

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const scrollableHeight = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const scrollPercentage = window.scrollY / scrollableHeight;

      vscode.postMessage({
        command: 'syncEditorScroll',
        scrollPercentage: Math.min(Math.max(scrollPercentage, 0), 1)
      });
    }, 50);
  });

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
  function updateTheme() {
    const body = document.body;
    const theme = body.getAttribute('data-vscode-theme-kind') || 
                  body.getAttribute('data-vscode-theme-name') || 
                  body.className.match(/vscode-(\w+)/)?.[0] || 
                  'vscode-light';
    
    // Apply theme to document element for CSS targeting
    document.documentElement.setAttribute('data-vscode-theme-kind', theme);
  }

  // Initial theme detection
  updateTheme();

  // Watch for theme changes
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && 
          (mutation.attributeName === 'class' || 
           mutation.attributeName === 'data-vscode-theme-kind' ||
           mutation.attributeName === 'data-vscode-theme-name')) {
        updateTheme();
      }
    });
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class', 'data-vscode-theme-kind', 'data-vscode-theme-name']
  });

  // Initialize
  console.log('WordPress Readme Preview loaded');
})();