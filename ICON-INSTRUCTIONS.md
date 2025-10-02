# Icon Creation Instructions

You need to create a 128x128 PNG icon from the existing SVG. Here are a few options:

## Option 1: Online SVG to PNG Converter
1. Go to https://convertio.co/svg-png/ or similar
2. Upload `media/icon.svg`
3. Set dimensions to 128x128 pixels
4. Download as `media/icon.png`

## Option 2: Using Inkscape (Free)
```bash
# Install Inkscape, then:
inkscape --export-png=media/icon.png --export-width=128 --export-height=128 media/icon.svg
```

## Option 3: Using ImageMagick
```bash
# Install ImageMagick, then:
convert -background none -size 128x128 media/icon.svg media/icon.png
```

## Option 4: VS Code Extension (Simple)
1. Install "SVG to PNG Converter" extension in VS Code
2. Right-click on icon.svg → "Convert SVG to PNG"
3. Set size to 128x128

After creating icon.png, update package.json:
```json
"icon": "media/icon.png",
```