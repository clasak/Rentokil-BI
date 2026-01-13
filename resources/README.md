# Native App Resources

This directory contains source assets for generating iOS and Android app icons and splash screens.

## Required Source Files

Before building native apps, place these files here:

### icon.png
- **Size:** 1024 x 1024 pixels
- **Format:** PNG with transparency (alpha channel)
- **Content:** App icon (Rentokil logo on red background)
- **Notes:** Should look good at all sizes from 20x20 to 1024x1024

### splash.png
- **Size:** 2732 x 2732 pixels (largest iPad Pro size)
- **Format:** PNG
- **Content:** Splash/launch screen (centered Rentokil logo on red #E4002B background)
- **Notes:** Keep important content in center 1200x1200 safe zone

## Generating Native Assets

After placing the source files, run:

```bash
# Install cordova-res if not already installed
npm install -g cordova-res

# Generate iOS assets
cordova-res ios --skip-config --copy

# Generate Android assets
cordova-res android --skip-config --copy
```

This will generate:
- iOS icons in all required sizes (20x20 to 1024x1024)
- iOS splash screens for all device sizes
- Android icons in all density buckets (mdpi to xxxhdpi)
- Android splash screens in all sizes

## Directory Structure (After Generation)

```
resources/
├── README.md           (this file)
├── icon.png            (source icon - YOU PROVIDE)
├── splash.png          (source splash - YOU PROVIDE)
├── ios/
│   ├── AppIcon.appiconset/
│   │   ├── Contents.json
│   │   ├── icon-20.png
│   │   ├── icon-20@2x.png
│   │   ├── icon-20@3x.png
│   │   ├── icon-29.png
│   │   ├── icon-29@2x.png
│   │   ├── icon-29@3x.png
│   │   ├── icon-40.png
│   │   ├── icon-40@2x.png
│   │   ├── icon-40@3x.png
│   │   ├── icon-60@2x.png
│   │   ├── icon-60@3x.png
│   │   ├── icon-76.png
│   │   ├── icon-76@2x.png
│   │   ├── icon-83.5@2x.png
│   │   └── icon-1024.png
│   └── splash/
│       └── (various splash screen sizes)
└── android/
    ├── mipmap-mdpi/
    │   └── ic_launcher.png (48x48)
    ├── mipmap-hdpi/
    │   └── ic_launcher.png (72x72)
    ├── mipmap-xhdpi/
    │   └── ic_launcher.png (96x96)
    ├── mipmap-xxhdpi/
    │   └── ic_launcher.png (144x144)
    ├── mipmap-xxxhdpi/
    │   └── ic_launcher.png (192x192)
    └── splash/
        └── (various splash screen sizes)
```

## Design Guidelines

### App Icon
- Use simple, recognizable imagery
- Avoid text (too small to read at icon sizes)
- Use bold colors that stand out
- Test at 29x29 and 1024x1024 to ensure clarity

### Splash Screen
- Keep branding centered
- Use the primary brand color (#E4002B) as background
- Don't include version numbers (they become outdated)
- Keep it simple - users see it briefly

## Color Reference

| Color | Hex | Usage |
|-------|-----|-------|
| Rentokil Red | #E4002B | Primary brand, backgrounds |
| White | #FFFFFF | Logo, text |
| Dark Gray | #030712 | Dark mode background |
