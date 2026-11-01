import type { Lesson, Scene } from '@athena/shared';
import type { VisualData } from '../types';
import { Headline, Kinetic, Quiz, Title } from './text';
import { Analogy, Flow, Timeline } from './diagram';
import { Chart, MapView, Table } from './data';

export const SceneVisual = (p: { scene: Scene; lesson: Lesson; accent: string; sceneFrames: number; data?: VisualData }) => {
  const { scene, accent, sceneFrames } = p;
  const v = scene.visual;
  switch (v.type) {
    case 'title': return <Title visual={v} accent={accent} />;
    case 'kinetic': return <Kinetic visual={v} accent={accent} sceneFrames={sceneFrames} />;
    case 'headline': return <Headline visual={v} accent={accent} />;
    case 'quiz': return <Quiz quiz={p.lesson.quiz} accent={accent} />;
    case 'analogy': return <Analogy visual={v} accent={accent} sceneFrames={sceneFrames} />;
    case 'flow': return <Flow visual={v} accent={accent} sceneFrames={sceneFrames} />;
    case 'timeline': return <Timeline visual={v} accent={accent} sceneFrames={sceneFrames} />;
    case 'map': return <MapView visual={v} accent={accent} />;
    case 'chart': return <Chart visual={v} data={p.data} accent={accent} sceneFrames={sceneFrames} />;
    case 'table': return <Table visual={v} accent={accent} />;
  }
};
