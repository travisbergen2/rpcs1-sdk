/**
 * Abstract geometric avatars for receiver personas.
 * Pure SVG — no binary assets, scales cleanly, one accent hue per persona.
 */
import type { AvatarMotif } from '@/lib/personas';

export function PersonaAvatar({ hue, motif, size = 72 }: { hue: number; motif: AvatarMotif; size?: number }) {
  const a = `hsl(${hue} 85% 62%)`;
  const b = `hsl(${hue} 70% 42%)`;
  const dim = `hsl(${hue} 45% 30%)`;
  const common = { width: size, height: size, viewBox: '0 0 72 72', 'aria-hidden': true as const };
  const bg = <rect width="72" height="72" rx="18" fill={`hsl(${hue} 45% 12%)`} />;

  switch (motif) {
    case 'rings':
      return (
        <svg {...common}>
          {bg}
          <circle cx="36" cy="36" r="22" fill="none" stroke={dim} strokeWidth="3" />
          <circle cx="36" cy="36" r="14" fill="none" stroke={b} strokeWidth="3" />
          <circle cx="36" cy="36" r="6" fill={a} />
        </svg>
      );
    case 'bolt':
      return (
        <svg {...common}>
          {bg}
          <path d="M40 12 L24 40 h10 L32 60 L50 30 h-12 Z" fill={a} />
          <path d="M40 12 L24 40 h10 l-1.5 6 L48 30 h-10 Z" fill={b} opacity="0.6" />
        </svg>
      );
    case 'weave':
      return (
        <svg {...common}>
          {bg}
          <path d="M12 26 C28 12, 44 40, 60 26" fill="none" stroke={dim} strokeWidth="4" strokeLinecap="round" />
          <path d="M12 38 C28 24, 44 52, 60 38" fill="none" stroke={b} strokeWidth="4" strokeLinecap="round" />
          <path d="M12 50 C28 36, 44 64, 60 50" fill="none" stroke={a} strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'facets':
      return (
        <svg {...common}>
          {bg}
          <path d="M36 12 L58 30 L48 58 H24 L14 30 Z" fill="none" stroke={b} strokeWidth="3" />
          <path d="M36 12 L36 58 M14 30 L58 30" stroke={dim} strokeWidth="2" />
          <circle cx="36" cy="30" r="5" fill={a} />
        </svg>
      );
    case 'grid':
      return (
        <svg {...common}>
          {bg}
          {[18, 32, 46].map((x) =>
            [18, 32, 46].map((y) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="8" height="8" rx="2" fill={x === 32 && y === 32 ? a : x === y ? b : dim} />
            )),
          )}
        </svg>
      );
    case 'field':
      return (
        <svg {...common}>
          {bg}
          <circle cx="24" cy="28" r="10" fill={dim} />
          <circle cx="44" cy="40" r="14" fill={b} opacity="0.75" />
          <circle cx="36" cy="26" r="5" fill={a} />
        </svg>
      );
  }
}
