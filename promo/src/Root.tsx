import { Composition, Folder } from 'remotion'
import { PROMO_FRAMES, Promo } from './Promo'
import { APP_DEMO_FRAMES, AppDemo } from './scenes/AppDemo'
import { INTRO_FRAMES, Intro } from './scenes/Intro'
import { OUTRO_FRAMES, Outro } from './scenes/Outro'

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Promo-Scenes">
      <Composition id="Intro" component={Intro} width={1920} height={1080} fps={30} durationInFrames={INTRO_FRAMES} />
      <Composition id="AppDemo" component={AppDemo} width={1920} height={1080} fps={30} durationInFrames={APP_DEMO_FRAMES} />
      <Composition id="Outro" component={Outro} width={1920} height={1080} fps={30} durationInFrames={OUTRO_FRAMES} />
    </Folder>
    <Composition id="Promo" component={Promo} width={1920} height={1080} fps={30} durationInFrames={PROMO_FRAMES} />
  </>
)
