'use client';

import { useState, type ReactNode } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { PawPrint } from 'lucide-react';
import { brand } from '@/config/brand';
import type { QuoteFormValues } from '@/lib/quote/form';

export interface QuoteStepProps {
  prices: Record<string, number>;
}
export type QuoteTextFieldName = {
  [K in keyof QuoteFormValues]-?: NonNullable<QuoteFormValues[K]> extends string ? K : never;
}[keyof QuoteFormValues];
type BooleanField = {
  [K in keyof QuoteFormValues]-?: NonNullable<QuoteFormValues[K]> extends boolean ? K : never;
}[keyof QuoteFormValues];

export function QuoteFieldError({ name }: { name: keyof QuoteFormValues }) {
  const { control, getFieldState } = useFormContext<QuoteFormValues>();
  const state = useFormState({ control, name, exact: true });
  const error = getFieldState(name, state).error;
  return (
    <span id={`quote-error-${name}`} className="quote-error" role={error ? 'alert' : undefined}>
      {error?.message}
    </span>
  );
}
export function QuoteTextField({
  name,
  label,
  placeholder,
  multiline = false,
  type = 'text',
}: {
  name: QuoteTextFieldName;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  const { register, control, getFieldState } = useFormContext<QuoteFormValues>();
  const state = useFormState({ control, name, exact: true });
  const invalid = !!getFieldState(name, state).error;
  const props = {
    ...register(name),
    id: `quote-${name}`,
    placeholder,
    'aria-invalid': invalid,
    'aria-describedby': `quote-error-${name}`,
  };
  return (
    <label className="quote-field" htmlFor={props.id}>
      <span>{label}</span>
      {multiline ? (
        <textarea {...props} rows={3} />
      ) : (
        <input
          {...props}
          type={type}
          autoComplete={
            name === 'email' ? 'email' : name === 'phone' ? 'tel' : name === 'name' ? 'name' : 'off'
          }
        />
      )}
      <QuoteFieldError name={name} />
    </label>
  );
}
export function QuoteSelectField({
  name,
  label,
  children,
  help,
}: {
  name: QuoteTextFieldName;
  label: string;
  children: ReactNode;
  help?: string;
}) {
  const { register, control, getFieldState } = useFormContext<QuoteFormValues>();
  const state = useFormState({ control, name, exact: true });
  const invalid = !!getFieldState(name, state).error;
  return (
    <label className="quote-field" htmlFor={`quote-${name}`}>
      <span>{label}</span>
      <select
        {...register(name)}
        id={`quote-${name}`}
        aria-invalid={invalid}
        aria-describedby={`quote-error-${name}`}
      >
        {children}
      </select>
      {help && <small className="quote-inline-help">{help}</small>}
      <QuoteFieldError name={name} />
    </label>
  );
}
export function QuoteCheckboxField({ name, children }: { name: BooleanField; children: ReactNode }) {
  const { register, control, getFieldState } = useFormContext<QuoteFormValues>();
  const state = useFormState({ control, name, exact: true });
  const invalid = !!getFieldState(name, state).error;
  return (
    <div>
      <label className="quote-consent">
        <input
          type="checkbox"
          {...register(name)}
          aria-invalid={invalid}
          aria-describedby={`quote-error-${name}`}
        />
        <span>{children}</span>
      </label>
      <QuoteFieldError name={name} />
    </div>
  );
}
export function QuoteStepHelp({ children }: { children: ReactNode }) {
  return (
    <div className="quote-step-help">
      <PawPrint size={21} aria-hidden="true" />
      <p>
        <strong>{brand.assistantName} te orienta.</strong> {children}
      </p>
    </div>
  );
}
export function QuoteDetails({
  title,
  children,
  open = false,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  const [expanded, setExpanded] = useState(open);
  return (
    <details
      className="quote-step-details"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>
        {title}
        <span aria-hidden="true">+</span>
      </summary>
      <div className="quote-fields">{children}</div>
    </details>
  );
}
