import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { TitleScene } from '../scenes/TitleScene';
import { DashboardScene } from '../scenes/DashboardScene';
import { SalesAnalyticsScene } from '../scenes/SalesAnalyticsScene';
import { RoleNavigationScene } from '../scenes/RoleNavigationScene';
import { ClosingScene } from '../scenes/ClosingScene';

interface LeadershipDemoProps {
  title?: string;
  subtitle?: string;
}

export const LeadershipDemo: React.FC<LeadershipDemoProps> = ({
  title = 'Rentokil BI Dashboard',
  subtitle = 'Sales & Operations Intelligence'
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene durations (in frames at 30fps)
  const titleDuration = 60;        // 2 seconds
  const dashboardDuration = 75;    // 2.5 seconds
  const salesDuration = 75;        // 2.5 seconds
  const roleDuration = 60;         // 2 seconds
  const closingDuration = 60;      // 2 seconds (total: 9.5 seconds with transitions)

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
      {/* Title Scene */}
      <Sequence from={0} durationInFrames={titleDuration}>
        <TitleScene title={title} subtitle={subtitle} />
      </Sequence>

      {/* Dashboard Overview Scene */}
      <Sequence from={titleDuration - 15} durationInFrames={dashboardDuration}>
        <DashboardScene />
      </Sequence>

      {/* Sales Analytics Scene */}
      <Sequence from={titleDuration + dashboardDuration - 30} durationInFrames={salesDuration}>
        <SalesAnalyticsScene />
      </Sequence>

      {/* Role Navigation Scene */}
      <Sequence from={titleDuration + dashboardDuration + salesDuration - 30} durationInFrames={roleDuration}>
        <RoleNavigationScene />
      </Sequence>

      {/* Closing Scene */}
      <Sequence from={titleDuration + dashboardDuration + salesDuration + roleDuration - 30} durationInFrames={closingDuration}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
