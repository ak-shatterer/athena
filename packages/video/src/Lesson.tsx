import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { Background, Header, OnScreenText } from './components/Chrome';
import { Captions } from './components/Captions';
import { rise, useEnter } from './components/motion';
import { SceneVisual } from './scenes';
import { colors, fonts, layout, OUTRO_SEC, SCENE_PAD_SEC, themeFor } from './theme';
import type { LessonVideoProps, SceneMedia } from './types';

export const sceneFrames = (m: SceneMedia | undefined, fps: number) => Math.ceil(((m?.durationSec ?? 4) + SCENE_PAD_SEC) * fps);

export const totalFrames = (props: LessonVideoProps, fps: number) =>
  props.lesson.scenes.reduce((sum, _, i) => sum + sceneFrames(props.media[i], fps), 0) + Math.round(OUTRO_SEC * fps);

export const LessonVideo = ({ lesson, media, data }: LessonVideoProps) => {
  const { fps } = useVideoConfig();
  const { accent } = themeFor(lesson.category);
  let from = 0;
  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <Background accent={accent} />
      {lesson.scenes.map((scene, i) => {
        const frames = sceneFrames(media[i], fps);
        const isQuiz = scene.visual.type === 'quiz';
        const top = isQuiz ? layout.textTop : layout.visualTop;
        const seq = (
          <Sequence key={scene.id} from={from} durationInFrames={frames}>
            {!isQuiz && <OnScreenText text={scene.onScreenText} accent={accent} />}
            <div
              style={{
                position: 'absolute',
                top,
                height: layout.captionTop - top - 30,
                left: layout.pad,
                right: layout.pad,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SceneVisual scene={scene} lesson={lesson} accent={accent} sceneFrames={frames} data={data[scene.id]} />
            </div>
            <Captions text={scene.narration} speechSec={media[i]?.durationSec ?? 4} />
            {media[i]?.audio && <Audio src={staticFile(media[i].audio)} />}
          </Sequence>
        );
        from += frames;
        return seq;
      })}
      <Sequence from={from}>
        <Outro takeaway={lesson.takeaway} accent={accent} />
      </Sequence>
      <Header category={lesson.category} />
    </AbsoluteFill>
  );
};

const Outro = ({ takeaway, accent }: { takeaway: string; accent: string }) => {
  const t = useEnter(2);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: layout.pad, fontFamily: fonts.sans }}>
      <div style={{ ...rise(t), fontSize: 28, fontWeight: 800, letterSpacing: 5, color: accent }}>REMEMBER</div>
      <div style={{ ...rise(t), marginTop: 20, fontSize: 52, fontWeight: 800, lineHeight: 1.15, color: colors.text }}>{takeaway}</div>
    </AbsoluteFill>
  );
};
