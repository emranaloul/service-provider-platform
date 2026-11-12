export type PartOfDay = 'morning' | 'afternoon' | 'evening';

/** Greeting slot for a local hour (0–23): before noon, before 17:00, later. */
export const partOfDay = (hour: number): PartOfDay =>
  hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
