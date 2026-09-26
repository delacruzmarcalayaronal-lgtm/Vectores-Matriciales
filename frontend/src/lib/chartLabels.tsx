import type { ReactElement } from 'react';
import { PieLabelRenderProps } from 'recharts';

export function innerPercentLabel(props: PieLabelRenderProps): ReactElement | null {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  const p = Number(percent ?? 0);
  if (p < 0.05) return null;
  const radius = (Number(innerRadius ?? 0) + Number(outerRadius ?? 0)) / 2;
  const angle = (Number(midAngle ?? 0) * Math.PI) / 180;
  const x = Number(cx ?? 0) + radius * Math.cos(-angle);
  const y = Number(cy ?? 0) + radius * Math.sin(-angle);
  return (
    <text
      x={x}
      y={y}
      fill="#FFFFFF"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {(p * 100).toFixed(0)}%
    </text>
  );
}

export const darkTooltipStyle = {
  backgroundColor: '#0F172A',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#E2E8F0',
};

export const legendFormatter = (value: string) => (
  <span style={{ color: '#CBD5E1', fontSize: 12 }}>{value}</span>
);
