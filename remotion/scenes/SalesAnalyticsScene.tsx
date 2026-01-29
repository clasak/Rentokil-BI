import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export const SalesAnalyticsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideIn = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
    },
  });

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Chart bar animations
  const bar1Height = interpolate(frame, [15, 40], [0, 220], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bar2Height = interpolate(frame, [20, 45], [0, 180], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bar3Height = interpolate(frame, [25, 50], [0, 280], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bar4Height = interpolate(frame, [30, 55], [0, 240], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
      <div
        style={{
          padding: 60,
          opacity,
          transform: `translateX(${(1 - slideIn) * 100}px)`,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{
            fontSize: 48,
            color: 'white',
            margin: '0 0 10px 0',
            fontWeight: 'bold'
          }}>
            Sales Analytics & Pipeline
          </h2>
          <p style={{
            fontSize: 24,
            color: '#94a3b8',
            margin: 0
          }}>
            Interactive visualizations with drill-down capabilities
          </p>
        </div>

        <div style={{ display: 'flex', gap: 40, marginTop: 60 }}>
          {/* Sales Chart */}
          <div style={{
            flex: 1,
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: 12,
            padding: 30,
            border: '1px solid #334155',
          }}>
            <div style={{ fontSize: 20, color: 'white', marginBottom: 30, fontWeight: 600 }}>
              Monthly Sales Trend
            </div>

            {/* Simple bar chart */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 30,
              height: 300,
              paddingTop: 20
            }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: bar1Height,
                  background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '8px 8px 0 0',
                  marginBottom: 10,
                }}></div>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>Oct</div>
              </div>

              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: bar2Height,
                  background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '8px 8px 0 0',
                  marginBottom: 10,
                }}></div>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>Nov</div>
              </div>

              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: bar3Height,
                  background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                  borderRadius: '8px 8px 0 0',
                  marginBottom: 10,
                }}></div>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>Dec</div>
              </div>

              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: bar4Height,
                  background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: '8px 8px 0 0',
                  marginBottom: 10,
                  border: '2px solid #fbbf24',
                }}></div>
                <div style={{ fontSize: 14, color: '#fbbf24' }}>Jan</div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div style={{ width: 400 }}>
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: 12,
              padding: 30,
              border: '1px solid #334155',
              marginBottom: 20
            }}>
              <div style={{ fontSize: 16, color: '#94a3b8', marginBottom: 8 }}>
                Sales Today
              </div>
              <div style={{ fontSize: 40, color: '#10b981', fontWeight: 'bold' }}>
                $847K
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: 12,
              padding: 30,
              border: '1px solid #334155',
              marginBottom: 20
            }}>
              <div style={{ fontSize: 16, color: '#94a3b8', marginBottom: 8 }}>
                Speed to Install
              </div>
              <div style={{ fontSize: 40, color: '#3b82f6', fontWeight: 'bold' }}>
                8.3 days
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: 12,
              padding: 30,
              border: '1px solid #334155',
            }}>
              <div style={{ fontSize: 16, color: '#94a3b8', marginBottom: 8 }}>
                Backlog
              </div>
              <div style={{ fontSize: 40, color: '#f59e0b', fontWeight: 'bold' }}>
                324
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
