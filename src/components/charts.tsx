'use client';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const PAL = ['#542536', '#174D38', '#B96848', '#D99A42', '#8a857a'];
type Row = Record<string, string | number>;

export function Bars({ data, keys, x = 'name', height = 260 }: { data: Row[]; keys: string[]; x?: string; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Bar chart">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="#E9DAC2" vertical={false} />
          <XAxis dataKey={x} tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} width={56} /><Tooltip />
          {keys.length > 1 && <Legend />}
          {keys.map((k, i) => <Bar key={k} dataKey={k} fill={PAL[i % PAL.length]} radius={[3, 3, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Lines({ data, keys, x = 'name', height = 260 }: { data: Row[]; keys: string[]; x?: string; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Line chart">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="#E9DAC2" vertical={false} />
          <XAxis dataKey={x} tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} width={56} /><Tooltip /><Legend />
          {keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={PAL[i % PAL.length]} strokeWidth={2} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
