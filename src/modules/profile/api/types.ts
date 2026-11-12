import type { AttachmentCategory } from '@/shared/api/enums';

/** `ServiceProvider` (doc §6.2). */
export interface ServiceProvider {
  id: number;
  email: string;
  phone: string;
  /** Contact person. */
  firstName: string;
  lastName: string;
  companyName: string;
  crNumber: string;
  vatNumber: string;
  bankDetails: string;
  /** Relative media path. */
  icon: string | null;
  /** Legacy single attachment, relative media path. */
  attachment: string | null;
  /** Weekly closing days, bitmask (§2.2). */
  closingDay: number;
  status: boolean;
  categoryId: number;
  tags: { id: number; tagId: number; tagName: string }[] | null;
  translations:
    | { id: number; serviceProviderId: number; name: string; langId: number }[]
    | null;
  /** One-off closing dates. */
  dates:
    { id: number; closingDate: string; serviceProviderId: number }[] | null;
  /** Backend spelling (§18.9). */
  schaduleOffReasons:
    { id: number; Reason: string; ServiceProviderId: number }[] | null;
}

/** `Attachment` (doc §7.2). */
export interface ProviderAttachment {
  id: number;
  serviceProviderId: number;
  category: AttachmentCategory;
  fileName: string;
  /** Show this one to the user. */
  originalFileName: string;
  contentType: string | null;
  relativePath: string;
  createdDateUtc: string | null;
}
