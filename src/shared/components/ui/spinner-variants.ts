import { cva } from 'class-variance-authority';

export const spinnerVariants = cva('shrink-0 animate-spin', {
  variants: {
    size: {
      sm: 'size-3.5',
      default: 'size-4',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});
