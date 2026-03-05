'use client';

export type VoraStatus = 'online' | 'thinking' | 'offline' | 'error';

interface Props {
  status: VoraStatus;
  size?: number;
}

const STATUS_COLORS: Record<VoraStatus, string> = {
  online:   'bg-emerald-400',
  thinking: 'bg-amber-400',
  offline:  'bg-slate-500',
  error:    'bg-red-400',
};

const STATUS_PULSE: Record<VoraStatus, boolean> = {
  online:   false,
  thinking: true,
  offline:  false,
  error:    false,
};

export default function VORAStatusDot({ status, size = 8 }: Props) {
  const color  = STATUS_COLORS[status];
  const pulses = STATUS_PULSE[status];

  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {pulses && (
        <span
          className={`absolute inline-flex rounded-full ${color} opacity-75 animate-ping`}
          style={{ width: size, height: size }}
        />
      )}
      <span
        className={`relative inline-flex rounded-full ${color}`}
        style={{ width: size, height: size }}
      />
    </span>
  );
}
