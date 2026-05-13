import type { ReactNode } from 'react';

interface GlowButtonProps {
  children: ReactNode;
  variant?: 'ember' | 'secondary' | 'ghost' | 'danger' | 'warning';
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  ember: {
    background: '#ff2233',
    borderColor: '#f4f6ff',
    color: '#f4f6ff',
    boxShadow: '4px 4px 0 #1438a8',
  },
  secondary: {
    background: 'transparent',
    borderColor: '#38d8ff',
    color: '#38d8ff',
    boxShadow: '4px 4px 0 #1438a8',
  },
  ghost: {
    background: 'transparent',
    borderColor: 'rgba(244,246,255,.35)',
    color: 'rgba(244,246,255,.7)',
    boxShadow: 'none',
  },
  danger: {
    background: '#ff2233',
    borderColor: '#ff2233',
    color: '#f4f6ff',
    boxShadow: '4px 4px 0 rgba(200,18,30,.4)',
  },
  warning: {
    background: '#ffd60a',
    borderColor: '#ffd60a',
    color: '#04081d',
    boxShadow: '4px 4px 0 #1438a8',
  },
};

export function GlowButton({
  children,
  variant = 'ember',
  size,
  className = '',
  disabled,
  type = 'button',
  onClick,
}: GlowButtonProps) {
  const variantStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.ember;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`glow-button ${className}`}
      style={{
        ...variantStyle,
        fontSize: size === 'sm' ? 11 : 13,
        padding: size === 'sm' ? '6px 12px' : '9px 16px',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {children}
    </button>
  );
}
