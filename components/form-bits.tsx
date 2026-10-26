"use client";

import { useFormStatus } from "react-dom";
import { startTransition, type FormEvent, type ReactNode } from "react";
import { AlertIcon, CheckCircleIcon } from "./icons";

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function SubmitButton({
  children,
  pendingText,
  className = "a-btn",
  pending: pendingProp,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  /** For forms submitted with keepValuesOnSubmit (useFormStatus can't see those). */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending && <Spinner />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-medium text-rose-600 animate-fade-in">
      {message}
    </p>
  );
}

export function FormAlert({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 animate-slide-up">
        <AlertIcon className="mt-0.5 size-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }
  if (message) {
    return (
      <div role="status" className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 animate-slide-up">
        <CheckCircleIcon className="mt-0.5 size-4 shrink-0" />
        <span>{message}</span>
      </div>
    );
  }
  return null;
}

/**
 * onSubmit handler that runs a server action WITHOUT React's automatic form reset, so what the admin typed
 * (selects, checkboxes, text) is kept when the server answers with validation errors.
 * Pair with useActionState's isPending passed to <SubmitButton pending={…}>.
 */
export function keepValuesOnSubmit(dispatch: (fd: FormData) => void, prepare?: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    prepare?.(fd);
    startTransition(() => dispatch(fd));
  };
}
