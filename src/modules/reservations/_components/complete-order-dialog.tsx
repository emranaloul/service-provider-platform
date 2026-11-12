import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileText, Trash2 } from 'lucide-react';
import { EntityFormDialog } from '@/shared/components/layout/entity-form-dialog';
import { FieldsSkeleton } from '@/shared/components/skeletons';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Spinner } from '@/shared/components/ui/spinner';
import { Textarea } from '@/shared/components/ui/textarea';
import { notify } from '@/shared/lib/notify';
import {
  serviceQuestionsQuery,
  useCompleteOrder,
} from '@/modules/reservations/api/orders';
import type { Order } from '@/modules/reservations/api/types';
import {
  answerKey,
  completeErrors,
  orderServices,
  questionsForOrder,
} from '@/modules/reservations/lib/order-rules';

/**
 * Complete an order (doc §13.4): answer the questions of the booked
 * services, set fit / unfit, add at least one result file.
 */
export function CompleteOrderDialog({
  order,
  open,
  onClose,
}: {
  order: Pick<Order, 'id' | 'reservationServices'>;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('reservations');
  return (
    <EntityFormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t('complete.title', { id: order.id })}
      contentClassName='lg:max-w-2xl'
    >
      {open && <CompleteForm order={order} onDone={onClose} />}
    </EntityFormDialog>
  );
}

function CompleteForm({
  order,
  onDone,
}: {
  order: Pick<Order, 'id' | 'reservationServices'>;
  onDone: () => void;
}) {
  const { t } = useTranslation('reservations');
  const serviceIds = [...new Set(orderServices(order).map((s) => s.serviceId))];
  const questionsQuery = useQuery(serviceQuestionsQuery(serviceIds));
  const questions = questionsForOrder(order, questionsQuery.data ?? []);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isFit, setIsFit] = useState(true);
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const complete = useCompleteOrder();

  const input = { id: order.id, note, isFit, answers, files };
  const errors = completeErrors(input, questions);
  const invalid = errors.unanswered.length > 0 || errors.noFiles;
  const missing = new Set(errors.unanswered.map(answerKey));

  const submit = async () => {
    setSubmitted(true);
    if (invalid) return;
    try {
      await complete.mutateAsync({ input, questions });
      notify(t('complete.done'), 'success');
      onDone();
    } catch {
      // Toasted globally.
    }
  };

  if (questionsQuery.isPending && serviceIds.length > 0) {
    return <FieldsSkeleton count={3} />;
  }

  return (
    <div className='flex flex-col gap-5 py-2'>
      <fieldset className='flex flex-col gap-2'>
        <legend className='mb-2 text-sm font-bold'>
          {t('complete.fitLabel')}
        </legend>
        <RadioGroup
          value={isFit ? 'fit' : 'unfit'}
          onValueChange={(v) => setIsFit(v === 'fit')}
          className='flex gap-6'
        >
          {(['fit', 'unfit'] as const).map((v) => (
            <div key={v} className='flex items-center gap-2'>
              <RadioGroupItem id={`fit-${v}`} value={v} />
              <Label htmlFor={`fit-${v}`}>{t(`drawer.${v}`)}</Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      {questions.length > 0 && (
        <fieldset className='flex flex-col gap-4'>
          <legend className='mb-2 text-sm font-bold'>
            {t('complete.questions')}
          </legend>
          {questions.map((q) => {
            const key = answerKey(q);
            const showError = submitted && missing.has(key);
            return (
              <div key={key} className='flex flex-col gap-1.5'>
                <Label htmlFor={`q-${key}`}>
                  {q.question}
                  {q.isRequired && <span className='text-destructive'>*</span>}
                </Label>
                <Input
                  id={`q-${key}`}
                  value={answers[key] ?? ''}
                  aria-invalid={showError}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [key]: e.target.value }))
                  }
                />
                {showError && (
                  <p role='alert' className='text-down text-small'>
                    {t('complete.required')}
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>
      )}

      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='complete-note'>{t('complete.note')}</Label>
        <Textarea
          id='complete-note'
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='complete-files'>
          {t('complete.files')}
          <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='complete-files'
          type='file'
          multiple
          aria-invalid={submitted && errors.noFiles}
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            setFiles((f) => [...f, ...picked]);
            e.target.value = '';
          }}
        />
        {files.length > 0 && (
          <ul className='flex flex-col gap-1.5'>
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className='border-line flex items-center gap-2 rounded-lg border px-3 py-2'
              >
                <FileText className='text-ink-2 size-4 shrink-0' />
                <span className='min-w-0 flex-1 truncate'>{f.name}</span>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  aria-label={t('drawer.removeFile', { name: f.name })}
                  onClick={() =>
                    setFiles((all) => all.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {submitted && errors.noFiles && (
          <p role='alert' className='text-down text-small'>
            {t('complete.filesRequired')}
          </p>
        )}
      </div>

      <div className='border-line flex justify-end gap-2.5 border-t pt-4'>
        <Button
          variant='secondary'
          onClick={onDone}
          disabled={complete.isPending}
        >
          {t('actions.close')}
        </Button>
        <Button onClick={() => void submit()} disabled={complete.isPending}>
          {complete.isPending && <Spinner />}
          {complete.isPending ? t('complete.submitting') : t('complete.submit')}
        </Button>
      </div>
    </div>
  );
}
