import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import { fontFamily } from '../theme'
import { WINDOW_BOTTOM } from './AppWindow'

// ウィンドウの下に出す、場面ごとの一言
export const Caption: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ top: WINDOW_BOTTOM, height: 1080 - WINDOW_BOTTOM, alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          fontFamily,
          fontSize: 54,
          fontWeight: 800,
          color: '#fafafa',
          opacity: interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          translate: interpolate(frame, [4, 22], ['0px 24px', '0px 0px'], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div style={{ width: 10, height: 50, borderRadius: 5, background: accent }} />
        {text}
      </div>
    </AbsoluteFill>
  )
}
