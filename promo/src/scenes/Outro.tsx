import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from 'remotion'
import { Backdrop } from '../components/Backdrop'
import { APP_URL, fontFamily, TYPE_COLORS } from '../theme'

export const OUTRO_FRAMES = 150

const FEATURES = [
  { label: 'Undo / Redo', color: TYPE_COLORS.requirement },
  { label: 'Node の検索', color: TYPE_COLORS.api },
  { label: 'View の切り替え', color: TYPE_COLORS.usecase },
  { label: 'Auto Layout', color: TYPE_COLORS.entity },
  { label: 'JSON で保存・読み込み', color: TYPE_COLORS.external },
]

export const Outro: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Backdrop />
      <Interactive.Div
        name="Title"
        style={{
          position: 'absolute',
          top: 230,
          width: '100%',
          textAlign: 'center',
          fontSize: 104,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#fafafa',
          opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          translate: interpolate(frame, [0, 22], ['0px 30px', '0px 0px'], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        Architecture Workspace
      </Interactive.Div>
      <Interactive.Div
        name="Tagline"
        style={{
          position: 'absolute',
          top: 390,
          width: '100%',
          textAlign: 'center',
          fontSize: 46,
          fontWeight: 500,
          color: '#d4d4d8',
          opacity: interpolate(frame, [8, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          translate: interpolate(frame, [8, 30], ['0px 24px', '0px 0px'], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        ぱぱっと描いて、データの流れと実装するものを把握する
      </Interactive.Div>
      <div style={{ position: 'absolute', top: 510, width: '100%', display: 'flex', justifyContent: 'center', gap: 18 }}>
        {FEATURES.map((feature, i) => (
          <div
            key={feature.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 26px',
              borderRadius: 999,
              border: '1.5px solid rgba(255, 255, 255, 0.18)',
              background: 'rgba(255, 255, 255, 0.06)',
              fontSize: 30,
              fontWeight: 500,
              color: '#e4e4e7',
              opacity: interpolate(frame, [16 + i * 4, 28 + i * 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              translate: interpolate(frame, [16 + i * 4, 34 + i * 4], ['0px 20px', '0px 0px'], {
                easing: Easing.bezier(0.16, 1, 0.3, 1),
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 3, background: feature.color }} />
            {feature.label}
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 680,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          opacity: interpolate(frame, [38, 52], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          translate: interpolate(frame, [38, 60], ['0px 24px', '0px 0px'], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div style={{ fontSize: 30, color: '#a1a1aa' }}>インストール不要。ブラウザですぐ使えます</div>
        <div
          style={{
            padding: '18px 44px',
            borderRadius: 16,
            background: '#fafafa',
            color: '#18181b',
            fontSize: 46,
            fontWeight: 800,
          }}
        >
          {APP_URL}
        </div>
      </div>
    </AbsoluteFill>
  )
}
