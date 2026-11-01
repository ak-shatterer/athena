// Concept diagrams: analogy, flow, timeline. Elements build up during the scene.
import type { Visual } from '@athena/shared';
import { colors, fonts } from '../theme';
import { Icon } from '../components/Icon';
import { rise, useEnter } from '../components/motion';

type V<T extends Visual['type']> = Extract<Visual, { type: T }>;

export const Analogy = ({ visual, accent, sceneFrames }: { visual: V<'analogy'>; accent: string; sceneFrames: number }) => {
  const left = useEnter(4);
  const right = useEnter(Math.round(sceneFrames * 0.3));
  const relation = useEnter(Math.round(sceneFrames * 0.5));
  return (
    <div style={{ width: '100%', fontFamily: fonts.sans }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <AnalogyCard {...visual.left} t={left} accent={accent} />
        <div style={{ opacity: right, fontSize: 70, fontWeight: 800, color: accent }}>≈</div>
        <AnalogyCard {...visual.right} t={right} accent={accent} />
      </div>
      <div style={{ ...rise(relation), marginTop: 44, textAlign: 'center', fontSize: 40, fontWeight: 700, color: colors.text }}>
        {visual.relation}
      </div>
    </div>
  );
};

const AnalogyCard = ({ icon, label, t, accent }: { icon: string; label: string; t: number; accent: string }) => (
  <div
    style={{
      opacity: t,
      transform: `scale(${0.6 + t * 0.4})`,
      width: 270,
      height: 300,
      borderRadius: 32,
      background: colors.card,
      border: `3px solid ${accent}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
    }}
  >
    <Icon name={icon} size={120} color={colors.text} />
    <div style={{ fontSize: 34, fontWeight: 800, color: colors.text, textAlign: 'center', padding: '0 12px' }}>{label}</div>
  </div>
);

export const Flow = ({ visual, accent, sceneFrames }: { visual: V<'flow'>; accent: string; sceneFrames: number }) => {
  // Order nodes along the edges so the chain reads top to bottom.
  const order = topoOrder(visual);
  const step = (sceneFrames * 0.7) / order.length;
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: fonts.sans }}>
      {order.map((node, i) => {
        const edge = i > 0 ? visual.edges.find((e) => e.from === order[i - 1].id && e.to === node.id) : undefined;
        return (
          <FlowStep
            key={node.id}
            label={node.label}
            icon={node.icon}
            edgeLabel={i > 0 ? (edge?.label ?? '') : undefined}
            delay={Math.round(i * step) + 4}
            accent={accent}
            compact={order.length > 4}
          />
        );
      })}
    </div>
  );
};

const FlowStep = (p: { label: string; icon?: string; edgeLabel?: string; delay: number; accent: string; compact: boolean }) => {
  const t = useEnter(p.delay);
  const boxHeight = p.compact ? 84 : 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: t }}>
      {p.edgeLabel !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: p.compact ? 46 : 58, color: p.accent, fontSize: 26, fontWeight: 700 }}>
          <span style={{ fontSize: 34 }}>↓</span>
          {p.edgeLabel}
        </div>
      )}
      <div
        style={{
          transform: `scale(${0.8 + t * 0.2})`,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          height: boxHeight,
          minWidth: 380,
          padding: '0 30px',
          borderRadius: 24,
          background: colors.card,
          border: `3px solid ${p.accent}`,
        }}
      >
        {p.icon && <Icon name={p.icon} size={48} color={p.accent} />}
        <div style={{ fontSize: 36, fontWeight: 800, color: colors.text }}>{p.label}</div>
      </div>
    </div>
  );
};

function topoOrder(visual: V<'flow'>) {
  const incoming = new Set(visual.edges.map((e) => e.to));
  const start = visual.nodes.find((n) => !incoming.has(n.id)) ?? visual.nodes[0];
  const ordered = [start];
  while (ordered.length < visual.nodes.length) {
    const last = ordered[ordered.length - 1];
    const nextId = visual.edges.find((e) => e.from === last.id && !ordered.some((n) => n.id === e.to))?.to;
    const next = visual.nodes.find((n) => n.id === nextId) ?? visual.nodes.find((n) => !ordered.includes(n));
    if (!next) break;
    ordered.push(next);
  }
  return ordered;
}

export const Timeline = ({ visual, accent, sceneFrames }: { visual: V<'timeline'>; accent: string; sceneFrames: number }) => {
  const step = (sceneFrames * 0.7) / visual.events.length;
  return (
    <div style={{ width: '100%', position: 'relative', paddingLeft: 60, fontFamily: fonts.sans }}>
      <div style={{ position: 'absolute', left: 22, top: 10, bottom: 10, width: 6, borderRadius: 3, background: `${accent}55` }} />
      {visual.events.map((e, i) => (
        <TimelineEvent key={i} {...e} delay={Math.round(i * step) + 4} accent={accent} />
      ))}
    </div>
  );
};

const TimelineEvent = ({ date, label, delay, accent }: { date: string; label: string; delay: number; accent: string }) => {
  const t = useEnter(delay);
  return (
    <div style={{ ...rise(t, 20), position: 'relative', marginBottom: 36 }}>
      <div style={{ position: 'absolute', left: -50, top: 8, width: 26, height: 26, borderRadius: 13, background: accent }} />
      <div style={{ fontSize: 26, fontWeight: 800, color: accent }}>{date}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{label}</div>
    </div>
  );
};
