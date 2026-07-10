"use client";

import { useActionState } from "react";
import Link from "next/link";

export type ActionState = { error?: string };

// Wraps every create/edit form: runs the server action via useActionState,
// shows the returned validation error, and renders submit/cancel buttons.
// Successful actions redirect, so no success state is needed here.
export function FormFrame({
  action,
  submitLabel,
  cancelHref,
  children,
  maxWidth = "max-w-3xl",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  cancelHref?: string;
  children: React.ReactNode;
  /** Tailwind max-width for the form card. Wider forms pass e.g. "max-w-5xl". */
  maxWidth?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={`card ${maxWidth} space-y-5 p-6`}>
      {state.error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </div>
      )}
      {children}
      <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {cancelHref && (
          <Link href={cancelHref} className="btn-secondary">
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
