import { cn } from '@/lib/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'stable' | 'oscillation' | 'overload' | 'freeze' | 'neutral' | 'paid';
  className?: string;
}

const variantStyles: Record<string, string> = {
  stable:      'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  oscillation: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  overload:    'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  freeze:      'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  neutral:     'bg-gray-800 text-gray-300 border border-gray-700',
  paid:        'bg-amber-500/15 text-amber-400 border border-amber-500/30',
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
