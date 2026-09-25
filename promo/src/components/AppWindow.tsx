import { APP_URL, fontFamily } from '../theme'

// 録画した画面（CSS px で 1440x810）を等倍で収めるブラウザの枠
export const CONTENT_WIDTH = 1440
export const CONTENT_HEIGHT = 810
const BAR_HEIGHT = 44
export const WINDOW_TOP = 36
export const WINDOW_BOTTOM = WINDOW_TOP + BAR_HEIGHT + CONTENT_HEIGHT

export const AppWindow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: 'absolute',
      left: (1920 - CONTENT_WIDTH) / 2,
      top: WINDOW_TOP,
      width: CONTENT_WIDTH,
      borderRadius: 14,
      overflow: 'hidden',
      background: '#fff',
      boxShadow: '0 40px 100px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    }}
  >
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: BAR_HEIGHT,
        background: '#27272a',
      }}
    >
      <div style={{ position: 'absolute', left: 18, display: 'flex', gap: 9 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((color) => (
          <div key={color} style={{ width: 13, height: 13, borderRadius: '50%', background: color }} />
        ))}
      </div>
      <div
        style={{
          width: 560,
          padding: '5px 0',
          borderRadius: 8,
          background: '#3f3f46',
          color: '#d4d4d8',
          fontFamily,
          fontSize: 17,
          textAlign: 'center',
        }}
      >
        {APP_URL}
      </div>
    </div>
    <div style={{ position: 'relative', width: CONTENT_WIDTH, height: CONTENT_HEIGHT, overflow: 'hidden' }}>{children}</div>
  </div>
)
