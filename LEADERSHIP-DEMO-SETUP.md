# Leadership Demo Video - Complete Setup

## 🎯 What You Asked For

A professional 90-second leadership demo video featuring:
- ✅ **Actual dashboard walkthrough** (not animations)
- ✅ **Presenter narration** explaining features
- ✅ **Audio voiceover** with professional script
- ✅ **Live app interactions** showing real functionality

## 📦 What I've Created

### 1. **Presenter Script**
`remotion/presenter-script.md`

Complete 90-second narration script with:
- 7 timed sections (intro, command center, sales, SALTI, roles, mobile, closing)
- Exact wording for each segment
- Visual cues for what to show on screen
- Action items (clicks, hovers, navigation)

### 2. **Recording Scripts**
- `scripts/record-dashboard-demo.ts` - Automated browser navigation
- `scripts/generate-narration-audio.ts` - TTS audio generation

### 3. **Complete Recording Guide**
`remotion/RECORDING-GUIDE.md`

Step-by-step instructions for:
- Manual recording with OBS Studio (recommended)
- Automated recording with Puppeteer
- Audio generation options (TTS, recording, or voice actor)
- Combining video + audio

## 🚀 Quick Start (Recommended Method)

### Method 1: Manual Recording with OBS (Best Quality)

**Time Required**: 30-45 minutes

1. **Install OBS Studio** (free)
   ```bash
   brew install --cask obs
   ```

2. **Generate narration audio**

   **Option A: Online TTS** (easiest)
   - Visit https://ttsmaker.com
   - Paste narration from `remotion/presenter-script.md`
   - Download each segment as MP3
   - Save to `remotion/assets/audio/`

   **Option B: Google Cloud TTS** (best quality)
   ```bash
   npm run demo:generate-audio
   ```

3. **Record the walkthrough**
   ```bash
   # Start dashboard
   npm run dev

   # Open browser to localhost:3000
   # Start OBS recording
   # Follow presenter-script.md step by step
   # Stop recording
   ```

4. **Combine in video editor**
   - Import screen recording
   - Import audio files
   - Sync narration to screen actions
   - Export as MP4

**Tools**: OBS Studio + TTSMaker + iMovie/DaVinci Resolve

---

## 🤖 Automated Recording (Advanced)

### Prerequisites

```bash
npm install puppeteer-screen-recorder
```

### Run Automated Recording

```bash
# 1. Generate TTS audio
npm run demo:generate-audio

# 2. Start dashboard
npm run dev

# 3. Record automated walkthrough (in new terminal)
npm run demo:record-auto
```

This creates `remotion/assets/recordings/dashboard-demo.mp4`

Then combine with audio in video editor.

---

## 📝 Presenter Script Overview

| Time | Section | What to Show |
|------|---------|--------------|
| 0:00-0:08 | **Introduction** | Dashboard home page, loading |
| 0:08-0:25 | **Executive Command Center** | KPI cards, hover revenue/leads, click refresh |
| 0:25-0:42 | **Sales Analytics** | Navigate to Sales Today, show charts, speed-to-install, backlog |
| 0:42-0:58 | **SALTI Dashboard** | Daily check-in metrics, proposal pipeline |
| 0:58-1:15 | **Role Navigation** | Show role selector, demonstrate different user views |
| 1:15-1:25 | **Mobile & Features** | Resize to mobile, show live data badge |
| 1:25-1:30 | **Closing** | Return to command center, fade out |

---

## 🎙️ Audio Generation Options

### Option 1: Online TTS (Easiest)
1. Go to https://ttsmaker.com
2. Select voice: English (US), Professional Male
3. Paste each segment from presenter-script.md
4. Download as MP3
5. Save to `remotion/assets/audio/01-intro.mp3`, etc.

### Option 2: Google Cloud TTS (Best Quality)
```bash
# Set up Google Cloud credentials
export GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"

# Generate all 7 audio files
npm run demo:generate-audio
```

### Option 3: Record Yourself
- Use QuickTime / Audacity
- Read presenter-script.md
- Export as MP3 files

### Option 4: Hire Voice Actor (Most Professional)
- Fiverr.com: $20-50 for 90 seconds
- Send presenter-script.md
- Request deliverysplit into 7 segments

---

## 🎬 Combining Video + Audio

### Using iMovie (macOS)
1. Import screen recording
2. Import audio files 01-07
3. Drag audio to timeline at correct timestamps
4. Adjust timing to sync with visuals
5. Export as 1080p MP4

### Using DaVinci Resolve (Free, Professional)
1. Import screen recording to timeline
2. Add audio tracks below video
3. Use markers to sync narration with actions
4. Color grade if needed
5. Export as H.264 MP4

### Using Adobe Premiere Pro
1. Create sequence (1920x1080, 30fps)
2. Import screen recording
3. Import audio files
4. Sync to script timestamps
5. Export using YouTube 1080p preset

---

## 📋 Commands Reference

```bash
# Start dashboard for recording
npm run dev

# Generate TTS narration audio
npm run demo:generate-audio

# Manual recording guide (browser stays open)
npm run demo:record

# Automated screen recording
npm run demo:record-auto

# Preview in Remotion Studio (if using Remotion)
npm run video:preview
```

---

## 🎯 Deliverable

**Final Output**: `leadership-demo-narrated.mp4`

Specifications:
- Duration: 90 seconds
- Resolution: 1920x1080 Full HD
- Frame Rate: 30 FPS
- Audio: Professional voiceover narration
- Visuals: Live dashboard interactions
- Format: MP4 (H.264 codec)

---

## 🆘 Need Help?

### "I just want someone to do it for me"
Hire on Fiverr:
- Screen recording services: $25-50
- Voiceover + editing: $75-150
- Send them: `presenter-script.md` + access to running dashboard

### "I want to do it but need guidance"
1. Start with manual OBS recording (simplest)
2. Use online TTS for audio (ttsmaker.com)
3. Combine in iMovie (if macOS) or DaVinci Resolve
4. Follow `remotion/RECORDING-GUIDE.md` step-by-step

### "I want full automation"
1. Install: `npm install puppeteer-screen-recorder`
2. Set up Google Cloud TTS credentials
3. Run: `npm run demo:generate-audio`
4. Run: `npm run demo:record-auto`
5. Combine output files in video editor

---

## 📂 File Structure

```
remotion/
├── presenter-script.md          # Narration script with timing
├── RECORDING-GUIDE.md           # Detailed instructions
├── assets/
│   ├── audio/                   # Generated/recorded narration
│   │   ├── 01-intro.mp3
│   │   ├── 02-command-center.mp3
│   │   ├── 03-sales-analytics.mp3
│   │   ├── 04-salti.mp3
│   │   ├── 05-roles.mp3
│   │   ├── 06-mobile.mp3
│   │   └── 07-closing.mp3
│   └── recordings/              # Screen recordings
│       └── dashboard-demo.mp4
scripts/
├── record-dashboard-demo.ts     # Automated navigation
└── generate-narration-audio.ts  # TTS generation
```

---

## ✅ Recommended Workflow

**For Best Results** (45 minutes):

1. **Generate Audio** (10 min)
   ```bash
   # Use TTSMaker.com for each segment
   # Or: npm run demo:generate-audio
   ```

2. **Record Screen** (15 min)
   ```bash
   npm run dev
   # Open OBS, record browser following script
   ```

3. **Edit & Combine** (20 min)
   - Import to iMovie/DaVinci Resolve
   - Sync audio to video
   - Export MP4

**Result**: Professional 90-second leadership demo ready to present!

---

## 🎓 Pro Tips

- **Practice first**: Do a dry run before recording
- **Cursor highlighting**: Use Keycastr (macOS) to show clicks
- **Smooth movements**: Slow, deliberate mouse movements
- **Hide distractions**: Close other tabs, hide bookmarks bar
- **Background music**: Optional, keep at -20dB if used
- **Test audio**: Ensure TTS sounds natural and clear

---

## Next Steps

Choose your path:

- **🟢 Easy**: Manual OBS recording + Online TTS → 45 minutes
- **🟡 Medium**: Automated Puppeteer + Google TTS → Setup + automation
- **🔴 Outsource**: Hire on Fiverr → Send script + wait 2-3 days

All paths lead to the same deliverable: professional 90-second leadership demo video.

Ready to start? Open `remotion/RECORDING-GUIDE.md` for detailed instructions!
