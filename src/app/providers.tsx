import type { ReactNode } from 'react';
import { LazyMotion } from 'motion/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { Toaster } from '@/shared/components/ui/sonner';
import { ConfirmHost } from '@/shared/lib/confirm';
import { queryClient } from '@/shared/lib/query-client';
import { useTheme } from '@/shared/hooks/use-theme';

const loadMotionFeatures = () =>
  import('@/shared/lib/motion-features').then((m) => m.default);

export function Providers({ children }: { children: ReactNode }) {
  useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      {/* `strict`: a full `motion.*` component would pull the engine back in. */}
      <LazyMotion features={loadMotionFeatures} strict>
        <TooltipProvider>
          {children}
          <Toaster position='bottom-center' />
        </TooltipProvider>
      </LazyMotion>
      <ConfirmHost />
    </QueryClientProvider>
  );
}
