# Dashboard Demo Recording Guide

This guide helps you create a professional leadership demo video with narration.

## Quick Start (Recommended)

### Option 1: Manual Recording (Easiest)

1. **Install OBS Studio** (free screen recorder)
   ```bash
   # macOS
   brew install --cask obs

   # Or download from: https://obsproject.com/
   ```

2. **Set up OBS**
   - Source: Window Capture → Select Chrome/Firefox
   - Resolution: 1920x1080
   - Frame Rate: 30 FPS

3. **Record the walkthrough**
   ```bash
   # Start the dashboard
   npm run dev

   # Open browser to http://localhost:3000
   # Start OBS recording
   # Follow the presenter script in remotion/presenter-script.md
   ```

4. **Generate voiceover audio** (choose one):

   **Option A: Use online TTS** (easiest)
   - Visit: https://ttsmaker.com or https://www.naturalreaders.com
   - Paste each narration segment from `presenter-script.md`
   - Download as MP3
   - Save to `remotion/assets/audio/`

   **Option B: Record yourself**
   - Use QuickTime / Audacity
   - Read the presenter script
   - Export as MP3

   **Option C: Use Google Cloud TTS** (best quality)
   ```bash
   # Set up Google Cloud credentials
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"

   # Generate audio
   npx tsx scripts/generate-narration-audio.ts
   ```

5. **Combine in editing software**
   - Import screen recording
   - Import audio files
   - Sync narration to actions
   - Export as MP4

---

## Option 2: Automated Recording (Advanced)

### Prerequisites

```bash
npm install puppeteer-screen-recorder
```

### Generate Narration Audio

```bash
# Using Google Cloud TTS (requires auth)
npx tsx scripts/generate-narration-audio.ts

# Or manually create audio files in:
# remotion/assets/audio/01-intro.mp3
# remotion/assets/audio/02-command-center.mp3
# ... etc
```

### Record Dashboard Walkthrough

```bash
# Manual guidance (browser stays open)
npx tsx scripts/record-dashboard-demo.ts

# Automated recording (requires puppeteer-screen-recorder)
npx tsx scripts/record-dashboard-demo.ts --record
```

This will create `remotion/assets/recordings/dashboard-demo.mp4`

### Combine with Remotion

```bash
# Preview composition
npm run video:preview

# Render final video
npm run video:render-narrated
```

---

## Presenter Script Timing

| Time | Section | Visual | Duration |
|------|---------|--------|----------|
| 0:00 | Introduction | Home page | 8s |
| 0:08 | Command Center | KPI cards, hover interactions | 17s |
| 0:25 | Sales Analytics | Sales Today → Backlog | 17s |
| 0:42 | SALTI Dashboard | Daily check-in → Pipeline | 16s |
| 0:58 | Role Navigation | Admin panel, role preview | 17s |
| 1:15 | Mobile/Features | Responsive resize, live data | 10s |
| 1:25 | Closing | Return home, fade out | 5s |

**Total Duration: 90 seconds**

---

## Tips for Professional Results

### Voice Narration
- Speak at ~140 words per minute (conversational)
- Pause 0.5s before major transitions
- Emphasize key metrics (numbers, percentages)
- Professional tone but not robotic

### Screen Recording
- Close unnecessary browser tabs
- Hide bookmarks bar (Cmd+Shift+B)
- Use full screen mode (Cmd+Ctrl+F)
- Smooth, deliberate mouse movements
- Highlight clicks with cursor animation

### Cursor Highlighting (OBS)
- Install: Keycastr (macOS) or Carnac (Windows)
- Shows keypresses and mouse clicks
- Makes demo easier to follow

### Background Music (Optional)
- Subtle corporate/technology track
- Volume: -20dB to -25dB (behind voice)
- Sources: Epidemic Sound, Artlist, YouTube Audio Library

---

## Recommended Tools

### Screen Recording
- **OBS Studio** (Free, all platforms) - Best
- **QuickTime** (macOS, built-in) - Simple
- **Camtasia** (Paid) - Full editing suite
- **Loom** (Web-based) - Quick and easy

### Audio Recording
- **Audacity** (Free) - Audio editing
- **GarageBand** (macOS) - Professional quality
- **Adobe Audition** (Paid) - Industry standard

### Text-to-Speech
- **Google Cloud TTS** - Best quality, requires API
- **TTSMaker** - Free, web-based
- **NaturalReader** - Natural voices
- **ElevenLabs** - AI voices (realistic)

### Video Editing
- **Remotion** (React-based, what we're using)
- **DaVinci Resolve** (Free, professional)
- **iMovie** (macOS, simple)
- **Adobe Premiere** (Industry standard)

---

## Troubleshooting

### Dashboard not loading
```bash
# Ensure dev server is running
npm run dev

# Wait for "Ready on http://localhost:3000"
# Then start recording
```

### Audio sync issues
- Record narration while watching screen recording
- Use markers/timestamps in editing software
- Adjust timing in `presenter-script.md` if needed

### Low quality recording
- Set OBS to 1920x1080
- Use CBR (Constant Bitrate): 6000 Kbps
- Encoder: H.264
- Container: MP4

### Puppeteer script fails
- Dashboard must be running on port 3000
- Wait for pages to load (increase timeouts if slow)
- Check console for specific errors

---

## Next Steps

1. ✅ Review `remotion/presenter-script.md`
2. ⏯️  Choose recording method (OBS recommended)
3. 🎙️  Generate or record narration audio
4. 🎥 Record screen walkthrough
5. 🎬 Combine in editing software
6. 📤 Export final MP4

---

## File Structure

```
remotion/
├── presenter-script.md        # Narration script with timing
├── RECORDING-GUIDE.md         # This file
├── assets/
│   ├── audio/                 # TTS or recorded narration
│   │   ├── 01-intro.mp3
│   │   ├── 02-command-center.mp3
│   │   └── ...
│   └── recordings/            # Screen recordings
│       └── dashboard-demo.mp4
└── compositions/
    └── NarratedDemo.tsx       # Remotion composition (if using)
```

---

## Questions?

- **Need help with OBS?** See: https://obsproject.com/wiki/
- **Audio quality poor?** Try Google Cloud TTS or hire a voice actor (Fiverr)
- **Want automation?** Use Puppeteer + Remotion (advanced)

The manual OBS approach is recommended for best quality and control.
