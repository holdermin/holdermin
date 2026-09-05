import { memo } from 'react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

function Sparkline({ data = [], up = true, height = 48 }) {
  if (!data || data.length === 0) {
    return <div style={{ height }} className="w-full" />;
  }
  const points = data.map((v, i) => ({ i, v }));
  const color = up ? '#8cf2db' : '#ff7a8a';
  const id = `spark-${up ? 'u' : 'd'}-${Math.round(data[data.length - 1] * 1000)}`;
  const min = Math.min(...data);
  const max = Math.max(...data);
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[min, max]} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.8}
            fill={`url(#${id})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(Sparkline);
