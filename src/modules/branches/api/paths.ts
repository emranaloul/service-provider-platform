/** Provider-service endpoints of the Branch module (doc §8.1, §9.1, §10.1, §11.1). */

const BRANCH = 'Provider/ServiceProviderBranch';
const SLOT = 'Provider/ServiceProviderBranchSlot';
const SERVICE = 'Provider/ServiceProviderBranchService';
const VACCINE = 'Provider/ServiceProviderBranchVaccine';

export const BRANCH_PATHS = {
  list: `${BRANCH}/List`,
  getById: `${BRANCH}/GetById`,
  create: `${BRANCH}/Create`,
  update: `${BRANCH}/Update`,
  delete: `${BRANCH}/Delete`,
  multipleDelete: `${BRANCH}/MultipleDelete`,
} as const;

export const SLOT_PATHS = {
  list: `${SLOT}/List`,
  set: `${SLOT}/Set`,
  delete: `${SLOT}/Delete`,
  /** Backend spelling (doc §18.9). */
  deleteSlotTime: `${SLOT}/DeleteSLotTime`,
} as const;

export const BRANCH_SERVICE_PATHS = {
  list: `${SERVICE}/List`,
  create: `${SERVICE}/Create`,
  update: `${SERVICE}/Update`,
  delete: `${SERVICE}/Delete`,
} as const;

export const BRANCH_VACCINE_PATHS = {
  list: `${VACCINE}/List`,
  create: `${VACCINE}/Create`,
  update: `${VACCINE}/Update`,
  delete: `${VACCINE}/Delete`,
  addSlotTimes: `${VACCINE}/AddSlotTimes`,
  deleteSlotTime: `${VACCINE}/DeleteSlotTime`,
} as const;
