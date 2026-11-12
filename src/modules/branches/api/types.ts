/** Response shapes of the Branch endpoints (doc §8.2, §9.2, §10.2, §11.2). */

export interface BranchTag {
  /** Link-row id. */
  id: number;
  tagId: number;
  tagName: string;
}

export interface BranchTranslation {
  id: number;
  serviceProviderBranchId: number;
  langId: number;
  name: string;
  address: string;
}

export interface Branch {
  id: number;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  logo: string | null;
  latitude: number;
  longitude: number;
  countryId: number;
  countryName: string;
  cityId: number;
  cityName: string;
  serviceProviderId: number;
  serviceProvider: string;
  /** The parent provider's weekly closing-day bitmask (§2.2). */
  serviceProviderClosingDay: number;
  serviceProviderClassificationId: number;
  status: boolean;
  tags: BranchTag[] | null;
  translations: BranchTranslation[] | null;
}

export interface SlotService {
  /** Link-row id. */
  id: number;
  branchServiceSlotId: number;
  serviceProviderBranchServiceId: number;
}

export interface SlotTime {
  id: number;
  branchServiceSlotId: number;
  /** UTC time of day. */
  from: string;
  /** UTC time of day. */
  to: string;
  slotServices: SlotService[] | null;
}

export interface Slot {
  id: number;
  serviceProviderBranchId: number;
  serviceProviderBranch: string;
  /** One weekday bit (§2.2). */
  day: number;
  maxOccupancyPerDay: number;
  slotTimes: SlotTime[] | null;
}

export interface BranchServiceItem {
  id: number;
  serviceProviderBranchServiceId: number;
  serviceId: number;
  serviceName: string;
  /** Non-zero ⇒ the branch service is a service group. */
  serviceGroupId: number;
  serviceGroupName: string;
  isDeleted: boolean;
}

export interface BranchScheduleOff {
  id: number;
  serviceProviderBranchServiceId: number;
  date: string;
  isDeleted: boolean;
}

export interface BranchService {
  id: number;
  serviceProviderBranchId: number;
  serviceProviderBranch: string;
  cost: number;
  b2CPrice: number;
  b2BPrice: number;
  b2CDiscount: number;
  /** A single object, not an array. */
  services: BranchServiceItem | null;
  scheduleOffs: BranchScheduleOff[] | null;
}

export interface BranchVaccineSlotTime {
  /** Link-row id → `DeleteSlotTime`. */
  id: number;
  /** → `SlotTime.id`. */
  serviceProviderBranchSlotTimeId: number;
  timeFrom?: string;
  timeTo?: string;
}

export interface BranchVaccine {
  id: number;
  serviceProviderBranchId: number;
  branchName?: string;
  serviceProviderBranch?: string;
  serviceProviderId?: number;
  vaccineId: number;
  vaccineName?: string;
  vaccine?: string;
  cost: number;
  b2CPrice: number;
  b2BPrice: number;
  slotTimes?: BranchVaccineSlotTime[] | null;
}

/** Display name of a branch service: the group name for groups (§10.2). */
export const branchServiceName = (s: BranchService): string =>
  (s.services?.serviceGroupId
    ? s.services.serviceGroupName
    : s.services?.serviceName) ?? `#${s.id}`;

export const isServiceGroup = (s: BranchService): boolean =>
  !!s.services?.serviceGroupId;

/** Display name of a branch vaccine (§11.2). */
export const branchVaccineName = (v: BranchVaccine): string =>
  v.vaccineName ?? v.vaccine ?? `#${v.vaccineId}`;
