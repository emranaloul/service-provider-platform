/**
 * Pulse status pills (pulse.css `.pl` / `.p-*`): soft ground + strong text,
 * led by a 6px dot. Always paired with a word — never colour alone.
 * Complete literals only so Tailwind generates them.
 */
export const STATUS_BADGE_VARIANTS = {
  up: { chip: 'bg-up-soft text-up', dot: 'bg-up' },
  down: { chip: 'bg-down-soft text-down', dot: 'bg-down' },
  warn: { chip: 'bg-warn-soft text-warn', dot: 'bg-warn' },
  accent: { chip: 'bg-brand-soft text-brand', dot: 'bg-brand' },
  flat: { chip: 'bg-flat-soft text-flat', dot: 'bg-flat' },
  line: {
    chip: 'bg-transparent text-ink-2 shadow-[inset_0_0_0_1px_var(--ov-line-strong)]',
    dot: 'bg-ink-2',
  },
  solid: { chip: 'bg-brand text-on-brand', dot: 'bg-on-brand' },
  // MARHAB-era names kept as aliases.
  green: { chip: 'bg-up-soft text-up', dot: 'bg-up' },
  amber: { chip: 'bg-warn-soft text-warn', dot: 'bg-warn' },
  red: { chip: 'bg-down-soft text-down', dot: 'bg-down' },
  slate: { chip: 'bg-flat-soft text-flat', dot: 'bg-flat' },
  brand: { chip: 'bg-brand-soft text-brand', dot: 'bg-brand' },
} as const;

export type StatusBadgeVariant = keyof typeof STATUS_BADGE_VARIANTS;
