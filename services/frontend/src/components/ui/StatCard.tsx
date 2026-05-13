import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  unit?: string;
}

export function StatCard({ label, value, unit }: StatCardProps) {
  return (
    <div
      style={{
        position: 'relative',
        background: '#0d1b58',
        border: '3px solid #38d8ff',
        padding: '14px 16px',
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)',
        boxShadow: '4px 4px 0 #1438a8',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -2, left: -2, width: 38, height: 6, background: '#ff2233' }} />
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 3, color: '#38d8ff', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 36, lineHeight: 0.95, letterSpacing: 1, marginTop: 4, fontStyle: 'italic', color: '#f4f6ff' }}>
        {value}
      </div>
      {unit && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: '#7eecff', textTransform: 'uppercase', marginTop: 3 }}>
          {unit}
        </div>
      )}
    </div>
  );
}
