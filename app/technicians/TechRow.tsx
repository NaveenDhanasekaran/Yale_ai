"use client";

import { useState } from "react";
import { updateTechnician, setTechnicianStatus } from "@/app/actions";
import { TECH_STATUS_LABELS, type TechStatus, type Technician } from "@/lib/types";
import { CopyLinkButton } from "./CopyLinkButton";
import { DeleteTechButton } from "./DeleteTechButton";

type TechRowData = Technician & { access_token: string | null };

const STATUS_STYLES: Record<TechStatus, string> = {
  available: "bg-emerald-100 text-emerald-700",
  busy: "bg-amber-100 text-amber-700",
  off: "bg-slate-200 text-slate-600",
};

const STATUSES: TechStatus[] = ["available", "busy", "off"];

export function TechRow({ tech }: { tech: TechRowData }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await updateTechnician(fd);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <tr className="bg-violet-50/40">
        <td colSpan={6} className="px-5 py-4">
          <form onSubmit={save} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={tech.id} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Name</span>
              <input
                name="name"
                defaultValue={tech.name}
                required
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Phone</span>
              <input
                name="phone"
                defaultValue={tech.phone}
                required
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </label>
            <button
              disabled={busy}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-5 py-4 font-medium text-slate-900">{tech.name}</td>
      <td className="px-5 py-4 text-slate-700">{tech.phone}</td>
      <td className="px-5 py-4">
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[tech.status]}`}
        >
          {TECH_STATUS_LABELS[tech.status]}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex gap-1">
          {STATUSES.filter((s) => s !== tech.status).map((s) => (
            <form key={s} action={setTechnicianStatus}>
              <input type="hidden" name="id" value={tech.id} />
              <input type="hidden" name="status" value={s} />
              <button className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                {TECH_STATUS_LABELS[s]}
              </button>
            </form>
          ))}
        </div>
      </td>
      <td className="px-5 py-4">
        <CopyLinkButton token={tech.access_token} />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Edit
          </button>
          <DeleteTechButton id={tech.id} name={tech.name} />
        </div>
      </td>
    </tr>
  );
}
