import { linearTiming, TransitionSeries } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { APP_DEMO_FRAMES, AppDemo } from './scenes/AppDemo'
import { INTRO_FRAMES, Intro } from './scenes/Intro'
import { OUTRO_FRAMES, Outro } from './scenes/Outro'

const SCENE_FADE = 15

export const PROMO_FRAMES = INTRO_FRAMES + APP_DEMO_FRAMES + OUTRO_FRAMES - 2 * SCENE_FADE

export const Promo: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence name="Intro" durationInFrames={INTRO_FRAMES}>
      <Intro />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: SCENE_FADE })} />
    <TransitionSeries.Sequence name="AppDemo" durationInFrames={APP_DEMO_FRAMES}>
      <AppDemo />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: SCENE_FADE })} />
    <TransitionSeries.Sequence name="Outro" durationInFrames={OUTRO_FRAMES}>
      <Outro />
    </TransitionSeries.Sequence>
  </TransitionSeries>
)
