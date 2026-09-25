import { AbsoluteFill } from 'remotion'

// 全場面で共通の背景。アプリの Canvas と同じ点の格子に、青い光をうっすら重ねる
export const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: '#0f0f11',
      backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1.6px, transparent 1.6px)',
      backgroundSize: '36px 36px',
    }}
  >
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 38%, rgba(37, 99, 235, 0.2), transparent 62%)' }} />
  </AbsoluteFill>
)
