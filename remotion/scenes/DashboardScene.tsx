import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img } from 'remotion';

export const DashboardScene: React.FC = () => {
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

  // Animated KPI values
  const revenueValue = interpolate(frame, [20, 50], [0, 24.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const leadsValue = Math.floor(interpolate(frame, [20, 50], [0, 1847], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));

  const pipelineValue = interpolate(frame, [20, 50], [0, 12.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
      <div
        style={{
          padding: 60,
          opacity,
          transform: `translateX(${(1 - slideIn) * -100}px)`,
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
            Executive Command Center
          </h2>
          <p style={{
            fontSize: 24,
            color: '#94a3b8',
            margin: 0
          }}>
            Real-time KPIs powered by BigQuery
          </p>
        </div>

        {/* KPI Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 30,
          marginTop: 40
        }}>
          {/* Revenue Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: 12,
            padding: 30,
            border: '1px solid #334155',
          }}>
            <div style={{ fontSize: 18, color: '#94a3b8', marginBottom: 15 }}>
              Revenue MTD
            </div>
            <div style={{ fontSize: 56, color: '#10b981', fontWeight: 'bold' }}>
              ${revenueValue.toFixed(1)}M
            </div>
            <div style={{ fontSize: 16, color: '#10b981', marginTop: 10 }}>
              ↑ 12.3% vs target
            </div>
          </div>

          {/* New Leads Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: 12,
            padding: 30,
            border: '1px solid #334155',
          }}>
            <div style={{ fontSize: 18, color: '#94a3b8', marginBottom: 15 }}>
              New Leads
            </div>
            <div style={{ fontSize: 56, color: '#3b82f6', fontWeight: 'bold' }}>
              {leadsValue.toLocaleString()}
            </div>
            <div style={{ fontSize: 16, color: '#3b82f6', marginTop: 10 }}>
              ↑ 8.5% vs last month
            </div>
          </div>

          {/* Pipeline Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: 12,
            padding: 30,
            border: '1px solid #334155',
          }}>
            <div style={{ fontSize: 18, color: '#94a3b8', marginBottom: 15 }}>
              Pipeline Value
            </div>
            <div style={{ fontSize: 56, color: '#f59e0b', fontWeight: 'bold' }}>
              ${pipelineValue.toFixed(1)}M
            </div>
            <div style={{ fontSize: 16, color: '#f59e0b', marginTop: 10 }}>
              60-day forecast
            </div>
          </div>
        </div>

        {/* Badge */}
        <div style={{
          position: 'absolute',
          top: 80,
          right: 80,
          background: '#10b981',
          color: 'white',
          padding: '8px 16px',
          borderRadius: 20,
          fontSize: 14,
          fontWeight: 600,
        }}>
          Live Data
        </div>
      </div>
    </AbsoluteFill>
  );
};
