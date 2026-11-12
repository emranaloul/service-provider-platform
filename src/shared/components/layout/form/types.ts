import type { ReactNode } from 'react';

/** Option shape shared by the select / radio field wrappers. */
export interface FieldOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}
