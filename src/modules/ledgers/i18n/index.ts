import { registerModule } from '@/shared/i18n/register';
import { ar } from './ar';
import { en } from './en';

export const NS = 'ledgers';
registerModule(NS, { ar, en });
