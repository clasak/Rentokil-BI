import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - 5,
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

  const taglineOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const featuresOpacity = interpolate(frame, [25, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{
        textAlign: 'center',
        color: 'white',
        opacity,
        transform: `scale(${scale})`,
      }}>
        {/* Logo */}
        <svg width="240" height="100" viewBox="0 0 240 100" style={{ marginBottom: 40 }}>
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E4002B" />
              <stop offset="100%" stopColor="#B8001F" />
            </linearGradient>
          </defs>
          <text
            x="120"
            y="48"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="56"
            fontWeight="bold"
            fill="url(#logoGradient)"
            textAnchor="middle"
          >
            Rentokil
          </text>
          <text
            x="120"
            y="75"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="16"
            fontWeight="500"
            fill="rgba(255,255,255,0.7)"
            textAnchor="middle"
          >
            The Experts in Pest Control
          </text>
        </svg>

        {/* Tagline */}
        <h1
          style={{
            fontSize: 56,
            fontWeight: 'bold',
            margin: '0 0 20px 0',
            opacity: taglineOpacity,
            background: 'linear-gradient(135deg, #E4002B 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Data-Driven Excellence
        </h1>

        {/* Features */}
        <div
          style={{
            fontSize: 24,
            color: '#94a3b8',
            marginTop: 40,
            opacity: featuresOpacity,
            lineHeight: 1.8,
          }}
        >
          <div>✓ Real-time BigQuery Integration</div>
          <div>✓ Role-Based Dashboards</div>
          <div>✓ Mobile-Responsive Design</div>
          <div>✓ Interactive Visualizations</div>
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 60,
            fontSize: 20,
            color: 'white',
            opacity: featuresOpacity,
          }}
        >
          Sales & Operations Intelligence Platform
        </div>
      </div>
    </AbsoluteFill>
  );
};
