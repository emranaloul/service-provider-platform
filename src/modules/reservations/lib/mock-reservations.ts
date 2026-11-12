import type { ReservationStatus } from '@/shared/lib/reservation-status';

/**
 * TEMPORARY sample data (from the design boards) so the screens render
 * before the API exists. Replace with `api/reservations-api.ts` +
 * TanStack Query; never keep server data in component state or Zustand.
 */
export interface Reservation {
  id: number;
  name: string;
  mobile: string;
  branch: string;
  service: string;
  date: string; // ISO
  status: ReservationStatus;
  amount: number; // SAR, incl. VAT
}

export const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: 10241,
    name: 'Wesam jaber emp',
    mobile: '0551234567',
    branch: 'Test2',
    service: 'Medical fitness',
    date: '2026-11-10T09:00:00',
    status: 'checkedIn',
    amount: 230,
  },
  {
    id: 10242,
    name: 'لينا صالح',
    mobile: '0559876543',
    branch: 'Test 3',
    service: 'Medical fitness',
    date: '2026-11-10T11:30:00',
    status: 'accepted',
    amount: 230,
  },
  {
    id: 10243,
    name: 'سارة القحطاني',
    mobile: '0501112233',
    branch: 'Test2',
    service: 'Chest X-ray',
    date: '2026-11-11T10:00:00',
    status: 'accepted',
    amount: 40.25,
  },
  {
    id: 10239,
    name: 'test email',
    mobile: '0533334444',
    branch: 'Test2',
    service: 'Medical fitness',
    date: '2026-11-08T12:00:00',
    status: 'completed',
    amount: 230,
  },
  {
    id: 10244,
    name: 'عمر حداد',
    mobile: '0544445555',
    branch: 'Test2',
    service: 'Medical fitness',
    date: '2026-11-12T13:00:00',
    status: 'cancelled',
    amount: 230,
  },
  {
    id: 10238,
    name: 'Ahmad Kordy',
    mobile: '0566667777',
    branch: 'Test 3',
    service: 'Lab panel',
    date: '2026-11-06T09:30:00',
    status: 'delayed',
    amount: 115,
  },
];
