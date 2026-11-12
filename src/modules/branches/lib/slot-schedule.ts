import { WEEK_DAYS, type WeekDay } from '@/shared/api/enums';
import type { FormValue } from '@/shared/api/form-data';
import { diffCollection } from '@/shared/api/payload';
import { hasFlag } from '@/shared/lib/bit-flags';
import {
  localTimeToUtc,
  normalizeTime,
  utcTimeToLocal,
} from '@/shared/lib/utc-time';
import type { BranchVaccine, Slot } from '@/modules/branches/api/types';

/**
 * The weekly slot schedule of a branch (doc §9): one slot per open weekday,
 * each with time windows, the branch services bookable in each window and
 * (separately saved) the branch vaccines linked to it.
 */

export interface EditorTime {
  /** Stable React key — slot-time ids are 0 until saved. */
  key: string;
  /** Saved slot-time id, or 0. */
  id: number;
  /** Local `HH:mm`. */
  from: string;
  /** Local `HH:mm`. */
  to: string;
  /** Selected branch-service ids. */
  serviceIds: number[];
  /** Selected branch-vaccine ids. */
  vaccineIds: number[];
}

export interface EditorDay {
  day: WeekDay;
  /** Saved slot id, or 0. */
  id: number;
  /** An unsaved day can be left out of the schedule. */
  enabled: boolean;
  maxOccupancyPerDay: string;
  times: EditorTime[];
}

/** What the server held when the schedule was loaded — the base for diffs. */
export interface ScheduleOrigin {
  /** slot-time id → its service links. */
  services: Map<number, { id: number; key: number }[]>;
  /** slot-time id → its vaccine links (branch-vaccine id → link id). */
  vaccines: Map<number, { id: number; key: number }[]>;
}

let seq = 0;
export const newTimeKey = () => `new-${++seq}`;

export const emptyTime = (): EditorTime => ({
  key: newTimeKey(),
  id: 0,
  from: '',
  to: '',
  serviceIds: [],
  vaccineIds: [],
});

/** Open days = every weekday not in the provider's `closingDay` mask (§9.3). */
export const openDays = (closingDay: number): WeekDay[] =>
  WEEK_DAYS.filter((day) => !hasFlag(closingDay, day));

/** slot-time id → vaccine links, from each branch vaccine's `slotTimes`. */
function vaccineLinksBySlotTime(vaccines: readonly BranchVaccine[]) {
  const map = new Map<number, { id: number; key: number }[]>();
  for (const v of vaccines) {
    for (const link of v.slotTimes ?? []) {
      const list = map.get(link.serviceProviderBranchSlotTimeId) ?? [];
      list.push({ id: link.id, key: v.id });
      map.set(link.serviceProviderBranchSlotTimeId, list);
    }
  }
  return map;
}

export function buildSchedule(
  slots: readonly Slot[],
  closingDay: number,
  vaccines: readonly BranchVaccine[],
  ref: Date = new Date(),
): { days: EditorDay[]; origin: ScheduleOrigin } {
  const vaccineLinks = vaccineLinksBySlotTime(vaccines);
  const origin: ScheduleOrigin = {
    services: new Map(),
    vaccines: vaccineLinks,
  };

  const days = openDays(closingDay).map((day): EditorDay => {
    const slot = slots.find((s) => s.day === day);
    if (!slot) {
      return {
        day,
        id: 0,
        enabled: true,
        maxOccupancyPerDay: '1',
        times: [emptyTime()],
      };
    }
    const times = (slot.slotTimes ?? []).map((time): EditorTime => {
      const services = (time.slotServices ?? []).map((s) => ({
        id: s.id,
        key: s.serviceProviderBranchServiceId,
      }));
      origin.services.set(time.id, services);
      return {
        key: `t-${time.id}`,
        id: time.id,
        from: utcTimeToLocal(time.from, ref),
        to: utcTimeToLocal(time.to, ref),
        serviceIds: services.map((s) => s.key),
        vaccineIds: (vaccineLinks.get(time.id) ?? []).map((l) => l.key),
      };
    });
    return {
      day,
      id: slot.id,
      enabled: true,
      maxOccupancyPerDay: String(slot.maxOccupancyPerDay),
      times,
    };
  });
  return { days, origin };
}

export type ScheduleError =
  | { day: WeekDay; field: 'capacity' | 'noTimes' }
  | { day: WeekDay; time: string; field: 'from' | 'to' | 'order' };

/** §9.4, plus `from` before `to`. Only enabled days are checked. */
export function validateSchedule(days: readonly EditorDay[]): ScheduleError[] {
  const errors: ScheduleError[] = [];
  for (const d of days) {
    if (!d.enabled) continue;
    const cap = Number(d.maxOccupancyPerDay);
    if (!Number.isInteger(cap) || cap < 1) {
      errors.push({ day: d.day, field: 'capacity' });
    }
    if (d.times.length === 0) errors.push({ day: d.day, field: 'noTimes' });
    for (const t of d.times) {
      if (!t.from) errors.push({ day: d.day, time: t.key, field: 'from' });
      if (!t.to) errors.push({ day: d.day, time: t.key, field: 'to' });
      if (t.from && t.to && t.from >= t.to) {
        errors.push({ day: d.day, time: t.key, field: 'order' });
      }
    }
  }
  return errors;
}

/**
 * `PUT …/Set` body (§9.5): the whole week; days with no slot times are
 * skipped, services are diffed per slot time on the branch-service id.
 */
export function setSchedulePayload(
  days: readonly EditorDay[],
  origin: ScheduleOrigin,
  branchId: number,
  ref: Date = new Date(),
): Record<string, FormValue> {
  const requests = days
    .filter((d) => d.enabled && d.times.length > 0)
    .map((d) => ({
      id: d.id,
      serviceProviderBranchId: branchId,
      day: d.day,
      maxOccupancyPerDay: Number(d.maxOccupancyPerDay),
      times: d.times.map((t) => ({
        id: t.id,
        from: localTimeToUtc(t.from, ref),
        to: localTimeToUtc(t.to, ref),
        services: diffCollection(
          t.id ? (origin.services.get(t.id) ?? []) : [],
          t.serviceIds,
        ).map((s) => ({
          id: s.id,
          serviceProviderBranchServiceId: s.key,
          isDeleted: s.isDeleted,
        })),
      })),
    }));
  return { requests };
}

export interface VaccineLinkChanges {
  /** branch-vaccine id → slot-time ids to link (`AddSlotTimes`). */
  add: Map<number, number[]>;
  /** Link-row ids to remove (`DeleteSlotTime`). */
  remove: number[];
  /** New slot times whose saved id could not be found (not linked). */
  unresolved: number;
}

/**
 * Vaccine ↔ slot-time changes to apply after a successful Set (§9.7). New
 * slot times get their id from the refetched schedule, matched on
 * (day, UTC from, UTC to).
 */
export function vaccineLinkChanges(
  days: readonly EditorDay[],
  origin: ScheduleOrigin,
  saved: readonly Slot[],
  ref: Date = new Date(),
): VaccineLinkChanges {
  const add = new Map<number, number[]>();
  const remove: number[] = [];
  let unresolved = 0;

  for (const d of days) {
    if (!d.enabled) continue;
    for (const t of d.times) {
      let timeId = t.id;
      if (!timeId) {
        const from = localTimeToUtc(t.from, ref);
        const to = localTimeToUtc(t.to, ref);
        timeId =
          saved
            .find((s) => s.day === d.day)
            ?.slotTimes?.find(
              (st) =>
                normalizeTime(st.from) === from && normalizeTime(st.to) === to,
            )?.id ?? 0;
        if (!timeId) {
          if (t.vaccineIds.length) unresolved++;
          continue;
        }
      }
      const before = t.id ? (origin.vaccines.get(t.id) ?? []) : [];
      for (const change of diffCollection(before, t.vaccineIds)) {
        if (change.isDeleted) remove.push(change.id);
        else if (change.id === 0) {
          add.set(change.key, [...(add.get(change.key) ?? []), timeId]);
        }
      }
    }
  }
  return { add, remove, unresolved };
}
