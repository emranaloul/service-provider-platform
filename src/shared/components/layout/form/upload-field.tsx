import * as React from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FileText, Trash2 } from 'lucide-react';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface UploadFieldProps<T extends FieldValues> {
  control?: Control<T>;
  name: FieldPath<T>;
  /** `accept` attribute (constrained MIME/extension list). */
  accept?: string;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  /** Store a `File[]` instead of a single `File | null`. */
  multiple?: boolean;
  /** Render file cards (icon + name) instead of image thumbnails. */
  isFile?: boolean;
  /** Label for the per-file delete button (a11y). */
  removeLabel?: string;
  className?: string;
}

/** The subset of an RHF field the upload control drives. */
interface UploadField {
  value: unknown;
  onChange: (value: File | File[] | null) => void;
  onBlur: () => void;
}

function normalize(value: unknown, multiple: boolean): File[] {
  if (multiple) return Array.isArray(value) ? (value as File[]) : [];
  return value instanceof File ? [value] : [];
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Inner control (own top-level hooks, so it can live inside `FormField`'s
 * render-prop). Owns the object-URL lifecycle — URLs are created for the current
 * files and **revoked on cleanup** (guide §3.6), mirroring the original
 * `URL.createObjectURL` / `revokeObjectURL` behavior.
 */
function UploadControl({
  field,
  accept,
  multiple,
  isFile,
  disabled,
  removeLabel = 'Remove file',
}: {
  field: UploadField;
  accept?: string;
  multiple: boolean;
  isFile: boolean;
  disabled?: boolean;
  removeLabel?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const files = React.useMemo(
    () => normalize(field.value, multiple),
    [field.value, multiple],
  );
  // Preview URLs derived from the current files; the effect below revokes them
  // on change/unmount so blobs don't leak (guide §3.6).
  const urls = React.useMemo(
    () => (isFile ? [] : files.map((f) => URL.createObjectURL(f))),
    [files, isFile],
  );
  React.useEffect(
    () => () => urls.forEach((u) => URL.revokeObjectURL(u)),
    [urls],
  );

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    field.onChange(multiple ? [...files, ...picked] : picked[0]);
  };

  const removeAt = (index: number) => {
    field.onChange(multiple ? files.filter((_, i) => i !== index) : null);
    // Reset the native input so re-picking the same file still fires `change`.
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className='grid gap-3'>
      <FormControl>
        <Input
          ref={inputRef}
          type='file'
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={onPick}
          onBlur={field.onBlur}
        />
      </FormControl>

      {files.length > 0 && (
        <ul
          className={cn(
            'grid gap-2',
            isFile ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3',
          )}
        >
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className='border-input bg-card flex items-center gap-3 rounded-lg border p-2 dark:bg-transparent'
            >
              {isFile ? (
                <span className='bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-md'>
                  <FileText className='size-4.5' />
                </span>
              ) : (
                <img
                  src={urls[i]}
                  alt={file.name}
                  className='size-11 shrink-0 rounded-md object-cover'
                />
              )}
              <div className='min-w-0 flex-1'>
                <div className='truncate text-sm font-medium'>{file.name}</div>
                <div dir='ltr' className='text-muted-foreground text-xs'>
                  {humanSize(file.size)}
                </div>
              </div>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                aria-label={removeLabel}
                disabled={disabled}
                className='text-muted-foreground hover:text-destructive shrink-0'
                onClick={() => removeAt(i)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * RHF-bound file / image upload (guide §3.6 `CustomUploadFile`). No shadcn
 * primitive exists, so this is a styled `Input type="file"` plus preview cards
 * with per-file delete. Stores actual `File` objects (single → `File | null`,
 * `multiple` → `File[]`); serialize on submit as the consuming form needs.
 */
export function UploadField<T extends FieldValues>({
  control,
  name,
  accept,
  label,
  description,
  required,
  disabled,
  multiple = false,
  isFile = false,
  removeLabel,
  className,
}: UploadFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
              {required && <span className='text-destructive'>*</span>}
            </FormLabel>
          )}
          <UploadControl
            field={field}
            accept={accept}
            multiple={multiple}
            isFile={isFile}
            disabled={disabled}
            removeLabel={removeLabel}
          />
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
