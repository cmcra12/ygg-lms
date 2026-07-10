"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addComment, type CommentRow } from "@/app/(app)/commentsActions";
import { formatDateTime } from "@/lib/format";

// Comments thread for an entity (e.g. a collections case on an account).
export function Comments({
  entityType,
  entityId,
  comments,
  revalidate,
}: {
  entityType: string;
  entityId: number;
  comments: CommentRow[];
  revalidate?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await addComment(entityType, entityId, body, revalidate);
      if (res.ok) {
        setBody("");
        router.refresh();
      } else {
        setError(res.error ?? "Could not add comment.");
      }
    });
  }

  return (
    <div className="card p-4">
      <div className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment — call notes, arrangements agreed, follow-ups…"
          rows={3}
          className="field-input w-full resize-y"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={pending || !body.trim()}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add comment"}
          </button>
        </div>
      </div>

      <div className="mt-4 divide-y divide-slate-100 border-t border-slate-200">
        {comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No comments yet — add the first one above.
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">{c.authorName}</span>
                <span className="shrink-0 text-xs tabular-nums text-slate-400">
                  {formatDateTime(c.createdAt)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
