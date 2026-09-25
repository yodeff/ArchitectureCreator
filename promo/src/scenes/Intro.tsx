import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from 'remotion'
import { Backdrop } from '../components/Backdrop'
import { fontFamily, TYPE_COLORS } from '../theme'

export const INTRO_FRAMES = 105

const CARD = { top: 300, width: 320, height: 104 }

// アプリの Node を模したカード。delay フレーム目から現れる
const MiniNode: React.FC<{ label: string; name: string; color: string; left: number; delay: number }> = ({
  label,
  name,
  color,
  left,
  delay,
}) => {
  const frame = useCurrentFrame()
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: CARD.top,
        width: CARD.width,
        height: CARD.height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 4,
        padding: '0 22px',
        boxSizing: 'border-box',
        borderRadius: 8,
        borderLeft: `7px solid ${color}`,
        background: '#fff',
        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.4)',
        fontFamily,
        opacity: interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        scale: interpolate(frame, [delay, delay + 18], [0.8, 1], {
          easing: Easing.spring({ damping: 14 }),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          output: 'perceptual-scale',
        }),
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.06em', color }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 500, color: '#18181b' }}>{name}</div>
      {[-6, CARD.width - 13].map((x) => (
        <div
          key={x}
          style={{ position: 'absolute', left: x, top: CARD.height / 2 - 6, width: 12, height: 12, borderRadius: '50%', background: '#18181b' }}
        />
      ))}
    </div>
  )
}

// Node の間の矢印。from フレーム目から線が伸びる
const Arrow: React.FC<{ x1: number; x2: number; color: string; from: number; label?: string }> = ({ x1, x2, color, from, label }) => {
  const frame = useCurrentFrame()
  const y = CARD.top + CARD.height / 2
  const length = x2 - x1
  const progress = interpolate(frame, [from, from + 14], [0, 1], {
    easing: Easing.bezier(0.65, 0, 0.35, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <>
      <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} width={1920} height={1080}>
        <line x1={x1} y1={y} x2={x1 + (length - 14) * progress} y2={y} stroke={color} strokeWidth={4} />
        <path d={`M ${x2} ${y} l -16 -9 v 18 z`} fill={color} opacity={progress >= 1 ? 1 : 0} />
      </svg>
      {label && (
        <div
          style={{
            position: 'absolute',
            left: x1,
            width: length,
            top: y - 52,
            textAlign: 'center',
            fontFamily,
            fontSize: 24,
            fontWeight: 800,
            color,
            opacity: interpolate(frame, [from + 10, from + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          {label}
        </div>
      )}
    </>
  )
}

export const Intro: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Backdrop />
      <MiniNode label="REQUIREMENT" name="商品を注文できる" color={TYPE_COLORS.requirement} left={340} delay={0} />
      <MiniNode label="USECASE" name="注文を作成する" color={TYPE_COLORS.usecase} left={800} delay={7} />
      <MiniNode label="DATABASE" name="orders" color="#64748b" left={1260} delay={14} />
      <Arrow x1={666} x2={794} color="#a1a1aa" from={16} />
      <Arrow x1={1126} x2={1254} color="#f97316" from={24} label="書く" />
      <Interactive.Div
        name="Title"
        style={{
          position: 'absolute',
          top: 520,
          width: '100%',
          textAlign: 'center',
          fontFamily,
          fontSize: 112,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#fafafa',
          opacity: interpolate(frame, [30, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          translate: interpolate(frame, [30, 52], ['0px 30px', '0px 0px'], {
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
          top: 690,
          width: '100%',
          textAlign: 'center',
          fontFamily,
          fontSize: 48,
          fontWeight: 500,
          color: '#a1a1aa',
          opacity: interpolate(frame, [42, 56], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          translate: interpolate(frame, [42, 64], ['0px 24px', '0px 0px'], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        作る前に、アプリの流れをざっと描く。
      </Interactive.Div>
    </AbsoluteFill>
  )
}
