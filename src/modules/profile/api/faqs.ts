import { queryOptions } from '@tanstack/react-query';
import { FaqType } from '@/shared/api/enums';
import { apiGet, currentCulture } from '@/shared/api/http-client';
import type { PagedResponse } from '@/shared/api/types';
import { pickTranslation } from '@/shared/lib/translation';
import type { Lang } from '@/shared/types/lang';

/**
 * FAQs (missing items §4). Global and targeted by audience; read-only for a
 * provider portal — create / edit are admin features and not wired here.
 */
export interface Faq {
  id: number;
  rank: number;
  status: boolean;
  type: FaqType;
  /** Relative media path(s). */
  attachments: string | null;
  translations:
    { id: number; langId: number; title: string; description: string }[] | null;
}

/** Items meant for providers: type Provider or All, active, by rank. */
export const providerFaqs = (list: readonly Faq[]) =>
  list
    .filter(
      (f) =>
        f.status && (f.type === FaqType.Provider || f.type === FaqType.All),
    )
    .sort((a, b) => a.rank - b.rank);

export const faqText = (faq: Faq, lang: Lang) => {
  const tr = pickTranslation(faq.translations, lang);
  return { title: tr?.title ?? '', description: tr?.description ?? '' };
};

export const providerFaqsQuery = (serviceProviderId: number) =>
  queryOptions({
    queryKey: ['faqs', serviceProviderId, currentCulture()],
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<Faq>>('General/FAQ/List?', {
        signal,
        params: {
          ServiceProviderId: serviceProviderId,
          pageNumber: 1,
          pageSize: 1000,
        },
      }).then((page) => providerFaqs(page?.data ?? [])),
    staleTime: 10 * 60_000,
  });
