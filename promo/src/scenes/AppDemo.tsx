import { Video } from '@remotion/media'
import { linearTiming, TransitionSeries } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { AppWindow, CONTENT_HEIGHT, CONTENT_WIDTH } from '../components/AppWindow'
import { Backdrop } from '../components/Backdrop'
import { Caption } from '../components/Caption'
import { Cursor } from '../components/Cursor'
import { clickTime, sceneFrames, type SceneId } from '../recording'
import { TYPE_COLORS } from '../theme'

// 画面を寄せる。t は場面の先頭からの秒、origin は寄せる中心（録画の CSS px）
interface Camera {
  keys: { t: number; scale: number }[]
  origin: { x: number; y: number }
}

interface Clip {
  scene: SceneId
  caption: string
  accent: string
  cursor?: boolean
  camera?: Camera
}

const FPS = 30
const CLIP_FADE = 12

const CLIPS: Clip[] = [
  {
    scene: 'overview',
    caption: '要件から DB まで、アプリの流れを 1 枚に',
    accent: TYPE_COLORS.requirement,
    cursor: false,
  },
  {
    scene: 'add',
    caption: '種類を選んで、Node を追加',
    accent: TYPE_COLORS.api,
    // 入力するあいだはパネルに寄せ、追加したら引いて、置かれた Node を見せる
    camera: {
      keys: [
        { t: clickTime('add', 0) + 0.2, scale: 1 },
        { t: clickTime('add', 0) + 0.9, scale: 1.75 },
        { t: clickTime('add', 3) + 0.1, scale: 1.75 },
        { t: clickTime('add', 3) + 0.8, scale: 1 },
      ],
      origin: { x: 1440, y: 40 },
    },
  },
  { scene: 'connect', caption: 'ドラッグして、線でつなぐ', accent: TYPE_COLORS.usecase },
  { scene: 'layout', caption: 'Auto Layout で、左から右へ整列', accent: TYPE_COLORS.entity },
  { scene: 'flow', caption: '選んだ UseCase に関わる流れを強調', accent: TYPE_COLORS.usecase },
  {
    scene: 'legend',
    caption: 'Node の種類は、クリーンアーキテクチャの層に対応',
    accent: TYPE_COLORS.external,
    camera: {
      keys: [
        { t: clickTime('legend', 0) + 0.1, scale: 1 },
        { t: clickTime('legend', 0) + 0.8, scale: 2.1 },
      ],
      origin: { x: 1440, y: 30 },
    },
  },
  { scene: 'views', caption: 'View を切り替えて、見たいところだけ', accent: TYPE_COLORS.database },
]

export const APP_DEMO_FRAMES =
  CLIPS.reduce((sum, clip) => sum + sceneFrames(clip.scene, FPS).duration, 0) - (CLIPS.length - 1) * CLIP_FADE

// 録画のうち、1 場面分を流す
const AppClip: React.FC<Clip> = ({ scene, cursor = true, camera }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { from } = sceneFrames(scene, fps)
  const keys = camera?.keys ?? [{ t: 0, scale: 1 }]
  const origin = camera?.origin ?? { x: 0, y: 0 }
  const scale =
    keys.length < 2
      ? keys[0].scale
      : interpolate(
          frame / fps,
          keys.map((k) => k.t),
          keys.map((k) => k.scale),
          { easing: Easing.bezier(0.65, 0, 0.35, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )

  return (
    <AbsoluteFill style={{ transformOrigin: `${origin.x}px ${origin.y}px`, scale }}>
      <Video src={staticFile('app.mp4')} trimBefore={from} muted style={{ width: CONTENT_WIDTH, height: CONTENT_HEIGHT }} />
      {cursor && <Cursor time={(from + frame) / fps} />}
    </AbsoluteFill>
  )
}

const fadeTransition = (key: string) => (
  <TransitionSeries.Transition key={key} presentation={fade()} timing={linearTiming({ durationInFrames: CLIP_FADE })} />
)

export const AppDemo: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill
        style={{
          opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          translate: interpolate(frame, [0, 24], ['0px 60px', '0px 0px'], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <AppWindow>
          <TransitionSeries>
            {CLIPS.flatMap((clip, i) => [
              ...(i > 0 ? [fadeTransition(`fade-${clip.scene}`)] : []),
              <TransitionSeries.Sequence key={clip.scene} name={clip.scene} durationInFrames={sceneFrames(clip.scene, fps).duration}>
                <AppClip {...clip} />
              </TransitionSeries.Sequence>,
            ])}
          </TransitionSeries>
        </AppWindow>
      </AbsoluteFill>
      <TransitionSeries>
        {CLIPS.flatMap((clip, i) => [
          ...(i > 0 ? [fadeTransition(`caption-fade-${clip.scene}`)] : []),
          <TransitionSeries.Sequence
            key={`caption-${clip.scene}`}
            name={`caption: ${clip.scene}`}
            durationInFrames={sceneFrames(clip.scene, fps).duration}
          >
            <Caption text={clip.caption} accent={clip.accent} />
          </TransitionSeries.Sequence>,
        ])}
      </TransitionSeries>
    </AbsoluteFill>
  )
}
