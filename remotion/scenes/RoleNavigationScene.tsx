import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export const RoleNavigationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const role1Opacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const role2Opacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const role3Opacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const role4Opacity = interpolate(frame, [25, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
      <div style={{ padding: 60, opacity }}>
        {/* Header */}
        <div style={{ marginBottom: 60, textAlign: 'center' }}>
          <h2 style={{
            fontSize: 48,
            color: 'white',
            margin: '0 0 10px 0',
            fontWeight: 'bold'
          }}>
            Role-Based Navigation
          </h2>
          <p style={{
            fontSize: 24,
            color: '#94a3b8',
            margin: 0
          }}>
            Tailored dashboards for every level of leadership
          </p>
        </div>

        {/* Role Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 40,
          maxWidth: 1400,
          margin: '0 auto'
        }}>
          {/* Executive */}
          <div style={{
            background: 'linear-gradient(135deg, #E4002B 0%, #B8001F 100%)',
            borderRadius: 12,
            padding: 40,
            opacity: role1Opacity,
            border: '2px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: 32, color: 'white', marginBottom: 15, fontWeight: 'bold' }}>
              Executive
            </div>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)' }}>
              • Command Center<br />
              • Market Performance<br />
              • Strategic Analytics
            </div>
          </div>

          {/* Market VP */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: 12,
            padding: 40,
            opacity: role2Opacity,
            border: '2px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: 32, color: 'white', marginBottom: 15, fontWeight: 'bold' }}>
              Market VP
            </div>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)' }}>
              • Regional Dashboard<br />
              • Branch Rankings<br />
              • Territory Analysis
            </div>
          </div>

          {/* Branch Manager */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: 12,
            padding: 40,
            opacity: role3Opacity,
            border: '2px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: 32, color: 'white', marginBottom: 15, fontWeight: 'bold' }}>
              Branch Manager
            </div>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)' }}>
              • Team Performance<br />
              • Lead Pipeline<br />
              • Operational Metrics
            </div>
          </div>

          {/* Account Executive */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: 12,
            padding: 40,
            opacity: role4Opacity,
            border: '2px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: 32, color: 'white', marginBottom: 15, fontWeight: 'bold' }}>
              Account Executive
            </div>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)' }}>
              • Sales Tracker<br />
              • Proposal Pipeline<br />
              • Personal Analytics
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
