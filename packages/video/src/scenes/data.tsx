// Data-driven visuals: map (offline world atlas), chart (series fetched before
// render), table (football-data, not wired yet: shows a placeholder card).
import { useMemo } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import type { Topology } from 'topojson-specification';
import { alpha3ToNumeric } from 'i18n-iso-countries';
import world from 'world-atlas/countries-50m.json';
import type { Visual } from '@athena/shared';
import type { VisualData } from '../types';
import { colors, fonts } from '../theme';
import { Icon } from '../components/Icon';
import { rise, useEnter } from '../components/motion';

type V<T extends Visual['type']> = Extract<Visual, { type: T }>;

const W = 624;
const H = 520;

const countries = feature(
  world as unknown as Topology,
  (world as unknown as Topology).objects.countries,
) as unknown as FeatureCollection<Geometry, { name: string }>;

export const MapView = ({ visual, accent }: { visual: V<'map'>; accent: string }) => {
  const t = useEnter(2, 30);
  const highlight = useEnter(12);
  const { paths, found } = useMemo(() => {
    const ids = new Set(visual.countries.map((c) => alpha3ToNumeric(c)).filter(Boolean));
    const targets = countries.features.filter((f) => ids.has(String(f.id)));
    // Fit the highlighted countries into the middle of the frame so neighbours show around them.
    const projection = geoMercator().fitExtent(
      [[W * 0.2, H * 0.15], [W * 0.8, H * 0.85]],
      { type: 'FeatureCollection', features: targets.length ? targets : countries.features },
    );
    const path = geoPath(projection);
    return {
      found: targets.length > 0,
      paths: countries.features.map((f) => ({ d: path(f) ?? '', on: ids.has(String(f.id)), key: String(f.id ?? f.properties.name) })),
    };
  }, [visual.countries]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: fonts.sans }}>
      <svg width={W} height={H} style={{ borderRadius: 28, background: 'rgba(255,255,255,0.04)', transform: `scale(${0.92 + t * 0.08})`, opacity: t }}>
        {paths.map((p) => (
          <path
            key={p.key}
            d={p.d}
            fill={p.on ? accent : 'rgba(255,255,255,0.14)'}
            fillOpacity={p.on ? 0.3 + highlight * 0.7 : 1}
            stroke={p.on ? '#fff' : 'rgba(255,255,255,0.25)'}
            strokeWidth={p.on ? 2 : 0.6}
          />
        ))}
      </svg>
      <div style={{ ...rise(highlight), marginTop: 26, fontSize: 34, fontWeight: 700, color: colors.text, textAlign: 'center' }}>
        {found ? visual.caption : `${visual.caption} (${visual.countries.join(', ')})`}
      </div>
    </div>
  );
};

export const Chart = ({ visual, data, accent, sceneFrames }: { visual: V<'chart'>; data?: VisualData; accent: string; sceneFrames: number }) => {
  const frame = useCurrentFrame();
  const appear = useEnter(2);
  if (!data || data.points.length < 2) {
    return <Placeholder icon="trending-up" title={visual.annotate ?? visual.series} subtitle="Chart data unavailable" accent={accent} />;
  }
  const values = data.points.map((p) => p[1]);
  const [min, max] = [Math.min(...values), Math.max(...values)];
  const pad = (max - min) * 0.1 || 1;
  const x = (i: number) => 30 + (i / (values.length - 1)) * (W - 60);
  const y = (v: number) => H - 60 - ((v - min + pad) / (max - min + 2 * pad)) * (H - 120);
  const shown = Math.max(2, Math.round(interpolate(frame, [6, sceneFrames * 0.7], [2, values.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  const line = values.slice(0, shown).map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values[shown - 1];
  const fmt = (v: number) => `${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}${data.unit ?? ''}`;
  const change = ((values[values.length - 1] - values[0]) / Math.abs(values[0])) * 100;

  return (
    <div style={{ width: '100%', fontFamily: fonts.sans, opacity: appear }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', color: colors.text }}>
        <div style={{ fontSize: 32, fontWeight: 800 }}>{data.label}</div>
        <div style={{ fontSize: 40, fontWeight: 800, color: accent }}>{fmt(last)}</div>
      </div>
      <svg width={W} height={H} style={{ marginTop: 12, borderRadius: 28, background: 'rgba(255,255,255,0.04)' }}>
        <path d={`${line} L${x(shown - 1)},${H - 40} L${x(0)},${H - 40} Z`} fill={`${accent}30`} />
        <path d={line} fill="none" stroke={accent} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(shown - 1)} cy={y(last)} r={11} fill="#fff" />
        <text x={30} y={H - 12} fill={colors.muted} fontSize={22} fontFamily={fonts.sans}>{data.points[0][0]}</text>
        <text x={W - 30} y={H - 12} fill={colors.muted} fontSize={22} fontFamily={fonts.sans} textAnchor="end">{data.points[values.length - 1][0]}</text>
      </svg>
      <div style={{ marginTop: 18, fontSize: 30, fontWeight: 700, color: colors.text }}>
        {visual.annotate ?? `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}% over this period`}
      </div>
    </div>
  );
};

export const Table = ({ visual, accent }: { visual: V<'table'>; accent: string }) => (
  <Placeholder icon="trophy" title={`${visual.ref} ${visual.kind === 'league' ? 'league table' : 'scoreline'}`} subtitle="Live football data coming soon" accent={accent} />
);

const Placeholder = ({ icon, title, subtitle, accent }: { icon: string; title: string; subtitle: string; accent: string }) => {
  const t = useEnter(4);
  return (
    <div style={{ ...rise(t), width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, fontFamily: fonts.sans }}>
      <Icon name={icon} size={160} color={accent} />
      <div style={{ fontSize: 44, fontWeight: 800, color: colors.text, textAlign: 'center' }}>{title}</div>
      <div style={{ fontSize: 26, color: colors.muted }}>{subtitle}</div>
    </div>
  );
};
