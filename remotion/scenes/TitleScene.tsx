import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface TitleSceneProps {
  title: string;
  subtitle: string;
}

export const TitleScene: React.FC<TitleSceneProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation
  const logoScale = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
      mass: 0.5,
    },
  });

  // Title animation
  const titleOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [15, 35], [50, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subtitle animation
  const subtitleOpacity = interpolate(frame, [25, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #E4002B 0%, #B8001F 100%)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ textAlign: 'center', color: 'white' }}>
        {/* Rentokil Logo */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            marginBottom: 40,
          }}
        >
          <svg width="200" height="80" viewBox="0 0 200 80">
            <text
              x="100"
              y="40"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="48"
              fontWeight="bold"
              fill="white"
              textAnchor="middle"
            >
              Rentokil
            </text>
            <text
              x="100"
              y="65"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="14"
              fontWeight="500"
              fill="rgba(255,255,255,0.9)"
              textAnchor="middle"
            >
              The Experts in Pest Control
            </text>
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            margin: '0 0 20px 0',
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 36,
            margin: 0,
            opacity: subtitleOpacity,
            fontWeight: 300,
          }}
        >
          {subtitle}
        </p>
      </div>
    </AbsoluteFill>
  );
};
