import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/utils';
import { tabsListVariants } from '@/shared/components/ui/tabs-variants';
import { useHasPermission } from '@/shared/permissions/has-permission';
import type { PermissionInput } from '@/shared/permissions/permission-types';

/**
 * Radix's `Tabs.Root` needs an explicit `dir` prop — same gotcha as
 * `Select.Root` (see select.tsx) — it does not reliably inherit
 * `document.documentElement.dir`, so arrow-key navigation order and
 * start/end-anchored layout (`justify-start` resolving to the right edge)
 * silently fall back to LTR even though the page is RTL.
 */
function Tabs({
  className,
  orientation = 'horizontal',
  dir,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const { i18n } = useTranslation();
  const resolvedDir = dir ?? (i18n.language === 'en' ? 'ltr' : 'rtl');
  return (
    <TabsPrimitive.Root
      data-slot='tabs'
      data-orientation={orientation}
      dir={resolvedDir}
      className={cn(
        'group/tabs flex gap-2 data-horizontal:flex-col',
        className,
      )}
      {...props}
    />
  );
}

function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot='tabs-list'
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

/**
 * `permission` gates the tab internally: not granted → the trigger renders
 * nothing. Put the same id on the matching `TabsContent` so a deep link to the
 * denied tab can't reveal its panel either.
 */
function TabsTrigger({
  className,
  permission,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & {
  permission?: PermissionInput;
}) {
  const allowed = useHasPermission(permission);
  if (!allowed) return null;

  return (
    <TabsPrimitive.Trigger
      data-slot='tabs-trigger'
      className={cn(
        "text-foreground/60 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:text-muted-foreground dark:hover:text-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pe-1 has-data-[icon=inline-start]:ps-1 group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent',
        'data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground',
        'after:bg-foreground after:absolute after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:-bottom-1.25 group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-inset-e-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  permission,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content> & {
  permission?: PermissionInput;
}) {
  const allowed = useHasPermission(permission);
  if (!allowed) return null;

  return (
    <TabsPrimitive.Content
      data-slot='tabs-content'
      className={cn('flex-1 text-sm outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
