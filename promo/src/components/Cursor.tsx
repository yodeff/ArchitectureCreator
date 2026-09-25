import { Easing, interpolate } from 'remotion'
import { cursorAt, recording } from '../recording'

const RIPPLE_SECONDS = 0.5

// 録画したマウスの軌跡に沿ってカーソルを描き、クリックした所に波紋を出す。time は録画の先頭からの秒
export const Cursor: React.FC<{ time: number }> = ({ time }) => {
  const { x, y } = cursorAt(time)
  const recent = recording.clicks.filter((c) => time >= c.t && time - c.t < RIPPLE_SECONDS)
  const pressed = recent.at(-1)

  return (
    <>
      {recent.map((c) => (
        <div
          key={c.t}
          style={{
            position: 'absolute',
            left: c.x,
            top: c.y,
            width: 64,
            height: 64,
            marginLeft: -32,
            marginTop: -32,
            borderRadius: '50%',
            border: '3px solid #2563eb',
            background: 'rgba(37, 99, 235, 0.18)',
            scale: interpolate(time - c.t, [0, RIPPLE_SECONDS], [0.2, 1], {
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            opacity: interpolate(time - c.t, [0, RIPPLE_SECONDS], [0.9, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        />
      ))}
      <svg
        width={26}
        height={36.4}
        viewBox="-2 -2 20 28"
        style={{
          position: 'absolute',
          left: x - 2.6,
          top: y - 2.6,
          overflow: 'visible',
          transformOrigin: '2.6px 2.6px',
          filter: 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35))',
          scale: pressed ? interpolate(time - pressed.t, [0, 0.08, 0.25], [1, 0.82, 1], { extrapolateRight: 'clamp' }) : 1,
        }}
      >
        <path
          d="M0 0 L0 20 L5 15.5 L8.6 23.4 L12 21.9 L8.5 14.2 L15 14.2 Z"
          fill="#fff"
          stroke="#18181b"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </svg>
    </>
  )
}
