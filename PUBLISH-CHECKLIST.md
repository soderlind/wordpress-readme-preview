# Pre-Publication Checklist for WordPress Readme Preview

## ❌ **Critical Issues to Fix:**

### 1. **Publisher Name**
- Current: `"publisher": "wordpress-readme-preview"`  
- **Issue**: This needs to be your actual VS Code Marketplace publisher ID
- **Fix**: Change to your Microsoft/GitHub account publisher name

### 2. **Icon Format** 
- Current: SVG icon (not supported)
- **Issue**: VS Code Marketplace requires PNG format
- **Fix**: Convert icon.svg to icon.png (128x128 pixels)

### 3. **Repository Links**
- **Missing**: Repository URL in package.json
- **Fix**: Add repository, bugs, and homepage URLs

## ✅ **Recommended Improvements:**

### 4. **Extension Categories**
- Current: ["Other", "Formatters", "Linters"]
- **Better**: ["Formatters", "Linters", "Other"] (most relevant first)

### 5. **Keywords Enhancement**
- Add more discoverable keywords: "validation", "wordpress.org", "wp-plugin"

### 6. **Version Strategy**
- Current: 0.1.0 (good for initial release)
- Consider: 1.0.0 for first stable release

## 🔧 **Publishing Commands:**

```bash
# Install vsce if not installed
npm install -g vsce

# Package the extension
vsce package

# Publish to marketplace  
vsce publish
```

## 📋 **Final Testing:**

- [ ] Test all commands work
- [ ] Test in both light and dark themes
- [ ] Test scroll synchronization
- [ ] Test context menus
- [ ] Test link rendering
- [ ] Verify no console errors