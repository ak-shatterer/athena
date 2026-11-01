import { Composition } from 'remotion';
import { VIDEO } from '@athena/shared';
import { LessonVideo, totalFrames } from './Lesson';
import type { LessonVideoProps } from './types';
import sample from './fixtures/sample.json';

// Studio previews a real lesson without audio; renders pass their own props.
export const RemotionRoot = () => (
  <Composition
    id="Lesson"
    component={LessonVideo}
    width={VIDEO.width}
    height={VIDEO.height}
    fps={VIDEO.fps}
    durationInFrames={VIDEO.fps * 60}
    defaultProps={sample as unknown as LessonVideoProps}
    calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props, VIDEO.fps) })}
  />
);
