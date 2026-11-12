import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CircleHelp, Paperclip } from 'lucide-react';
import { mediaUrl } from '@/shared/api/media';
import { ListError } from '@/shared/components/list-error';
import { IconTile, Panel, PanelHeader } from '@/shared/components/pulse';
import { LinesSkeleton } from '@/shared/components/skeletons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { faqText, providerFaqsQuery } from '@/modules/profile/api/faqs';

/** `attachments` may hold several comma-separated relative paths. */
const attachmentPaths = (value: string | null) =>
  (value ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

/**
 * FAQs tab: read-only list of the FAQs meant for providers.
 *
 * OPEN QUESTION: doc §17.2 gates this tab with the company area's
 * `view:company`, which a provider user would not normally hold. Until that
 * is settled it is shown to every signed-in provider user.
 */
export function ProviderFaqsPanel({ providerId }: { providerId: number }) {
  const { t } = useTranslation('profile');
  const lang = useUiLang();
  const faqs = useQuery(providerFaqsQuery(providerId));

  return (
    <Panel className='animate-enter'>
      <PanelHeader
        icon={
          <IconTile>
            <CircleHelp />
          </IconTile>
        }
        title={t('faqs.title')}
        description={t('faqs.description')}
      />
      <div className='px-5 pb-6' aria-busy={faqs.isPending}>
        {faqs.isPending ? (
          <LinesSkeleton count={5} />
        ) : faqs.isError ? (
          <ListError error={faqs.error} onRetry={() => void faqs.refetch()} />
        ) : faqs.data.length === 0 ? (
          <p className='text-ink-2'>{t('faqs.empty')}</p>
        ) : (
          <Accordion type='multiple'>
            {faqs.data.map((faq) => {
              const { title, description } = faqText(faq, lang);
              const files = attachmentPaths(faq.attachments);
              return (
                <AccordionItem key={faq.id} value={String(faq.id)}>
                  <AccordionTrigger className='text-start font-bold'>
                    {title}
                  </AccordionTrigger>
                  <AccordionContent className='flex flex-col gap-3'>
                    <p className='text-ink-2 whitespace-pre-line'>
                      {description}
                    </p>
                    {files.length > 0 && (
                      <ul className='flex flex-wrap gap-3'>
                        {files.map((path, i) => (
                          <li key={path}>
                            <a
                              href={mediaUrl(path)}
                              target='_blank'
                              rel='noreferrer'
                              className='text-brand inline-flex items-center gap-1.5 font-bold [&_svg]:size-4'
                            >
                              <Paperclip />
                              {t('faqs.attachment', { n: i + 1 })}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </Panel>
  );
}
