"use client";

import { removeTechnician } from "@/app/actions";

export function DeleteTechButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={removeTechnician}
      onSubmit={(e) => {
        if (!confirm(`Remove ${name}? This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
        Remove
      </button>
    </form>
  );
}
