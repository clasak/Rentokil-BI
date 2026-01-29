# Rentokil BI Leadership Demo Video

This folder contains the Remotion project for generating professional leadership demo videos of the Rentokil BI Dashboard.

## Video Specifications

- **Duration**: 9 seconds (270 frames at 30fps)
- **Resolution**: 1920x1080 (Full HD)
- **Format**: MP4 (H.264 codec)
- **File Size**: ~1.4 MB

## Scenes

### 1. Title Scene (2 seconds)
- Rentokil logo with gradient animation
- Dashboard title and subtitle
- Spring animations for smooth entrance

### 2. Dashboard Scene (2.5 seconds)
- Executive Command Center overview
- Animated KPI cards showing:
  - Revenue MTD: $24.8M (↑ 12.3%)
  - New Leads: 1,847 (↑ 8.5%)
  - Pipeline Value: $12.4M
- "Live Data" badge indicator

### 3. Sales Analytics Scene (2.5 seconds)
- Interactive bar chart showing monthly trends
- Animated bars for Oct, Nov, Dec, Jan
- Key metrics sidebar:
  - Sales Today: $847K
  - Speed to Install: 8.3 days
  - Backlog: 324

### 4. Role Navigation Scene (2 seconds)
- Role-based dashboard showcase
- Four role cards with gradient backgrounds:
  - Executive (red gradient)
  - Market VP (blue gradient)
  - Branch Manager (green gradient)
  - Account Executive (orange gradient)

### 5. Closing Scene (2 seconds)
- Rentokil logo with gradient
- "Data-Driven Excellence" tagline
- Feature checklist:
  - Real-time BigQuery Integration
  - Role-Based Dashboards
  - Mobile-Responsive Design
  - Interactive Visualizations

## Commands

### Preview the video in browser
```bash
npm run video:preview
```

Opens the Remotion Studio where you can:
- Preview all scenes interactively
- Scrub through the timeline
- Edit scene durations and transitions
- Test animations frame-by-frame

### Render the video
```bash
npm run video:render
```

Renders the final MP4 video to `out/leadership-demo.mp4`

### Upgrade Remotion
```bash
npm run video:upgrade
```

## File Structure

```
remotion/
├── index.ts                 # Entry point, registers Root component
├── Root.tsx                 # Composition registration
├── compositions/
│   └── LeadershipDemo.tsx   # Main composition with scene sequencing
└── scenes/
    ├── TitleScene.tsx       # Opening title with logo
    ├── DashboardScene.tsx   # Executive KPI cards
    ├── SalesAnalyticsScene.tsx # Charts and metrics
    ├── RoleNavigationScene.tsx # Role-based navigation
    └── ClosingScene.tsx     # Closing with features
```

## Customization

### Change Video Duration
Edit `remotion/Root.tsx`:
```tsx
durationInFrames={270} // 9 seconds at 30fps
```

### Adjust Scene Timing
Edit `remotion/compositions/LeadershipDemo.tsx`:
```tsx
const titleDuration = 60;      // 2 seconds
const dashboardDuration = 75;  // 2.5 seconds
// ... etc
```

### Modify Animations
Each scene uses Remotion's animation utilities:
- `spring()` - Physics-based animations
- `interpolate()` - Linear interpolations
- `useCurrentFrame()` - Frame-based timing

### Update Branding
- Logo: Edit SVG in `TitleScene.tsx` and `ClosingScene.tsx`
- Colors: Modify gradient stops in each scene
- Fonts: Update fontFamily in style objects

## Best Practices Used

Following `remotion-best-practices` skill recommendations:

✅ **Sequencing** - Overlapping scenes with transitions (-15 to -30 frames)
✅ **Animations** - Spring animations for smooth, natural motion
✅ **Timing** - Interpolation for controlled animations
✅ **Compositions** - Modular scene components
✅ **Tailwind** - Inline styles optimized for video rendering

## Performance

- **Rendering Time**: ~3 seconds on 8-core system
- **Concurrency**: 8x parallel rendering
- **Cache**: Bundled assets cached for faster subsequent renders

## Output Location

Rendered video: `out/leadership-demo.mp4`

## Next Steps

1. **Review**: Watch `out/leadership-demo.mp4`
2. **Customize**: Edit scenes in `remotion/scenes/`
3. **Re-render**: Run `npm run video:render`
4. **Share**: Present to leadership team

## Technologies

- **Remotion**: React-based video creation
- **TypeScript**: Type-safe video compositions
- **Spring Animations**: Physics-based motion
- **H.264**: Universal video codec
