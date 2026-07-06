"use client";

export function DeleteButton({
  action,
  label = "Delete",
  confirmMessage = "Delete this record? This cannot be undone.",
}: {
  action: () => Promise<void>;
  label?: string;
  confirmMessage?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <button type="submit" className="btn-danger text-xs">
        {label}
      </button>
    </form>
  );
}
