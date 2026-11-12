import { cva } from 'class-variance-authority';

/*
 * Pulse buttons (docs/design/pulse.css `.b`): pill, 40px tall, 13.5px/700.
 *   default     → `.bp` ink fill, violet on hover (the one primary per area)
 *   outline     → `.bs` surface + line border
 *   ghost       → `.bg` quiet, sunken on hover
 *   brand       → solid violet (rare: a single emphasised call to action)
 *   hero        → `.bh` for buttons placed on the dark hero / sidebar
 *   destructive → solid danger; destructiveOutline → danger outline
 */
export const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent bg-clip-padding text-[13.5px] font-bold whitespace-nowrap transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      variant: {
        default: 'bg-ink text-surface hover:bg-brand hover:text-on-brand',
        brand: 'bg-brand text-on-brand hover:bg-brand-strong',
        outline:
          'border-line bg-surface text-ink hover:border-line-strong aria-expanded:border-line-strong',
        secondary: 'bg-sunken text-ink-2 hover:text-ink',
        tint: 'bg-brand-soft text-brand hover:bg-brand-soft/70',
        ghost:
          'bg-transparent text-ink-2 hover:bg-sunken hover:text-ink aria-expanded:bg-sunken',
        hero: 'border-hero-line bg-hero-raised text-hero-ink hover:border-hero-accent',
        destructive: 'bg-down text-white hover:bg-down/90',
        destructiveOutline:
          'border-down bg-surface text-down hover:bg-down-soft',
        link: 'h-auto! gap-1.5 px-0! text-[13px] text-brand hover:text-brand-strong',
      },
      size: {
        default: 'h-10 gap-2 px-5',
        xs: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-4 text-[13px] [&_svg:not([class*='size-'])]:size-4",
        lg: 'h-11 gap-2 px-6',
        icon: 'size-10',
        'icon-xs': "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        'icon-sm': 'size-9',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
