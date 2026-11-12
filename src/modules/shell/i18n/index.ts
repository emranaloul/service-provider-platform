import { SHELL_NS } from '@/shared/i18n';
import { registerModule } from '@/shared/i18n/register';
import { ar } from './ar';
import { en } from './en';

export const NS = SHELL_NS;
registerModule(NS, { ar, en });
