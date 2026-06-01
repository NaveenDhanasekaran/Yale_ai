"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  techAccept,
  techReject,
  techReached,
  techCancel,
  techComplete,
} from "./actions";

export interface TechLead {
  customer_name: string;
  phone: string;
  address: string | null;
  area: string | null;
  request_type: "installation" | "breakdown";
  product_details: string | null;
  customer_remarks: string | null;
}

export interface TechJob {
  id: string;
  status: string;
  accept_deadline: string | null;
  lead: TechLead | null;
}

function getGps(): Promise<{ lat: number | null; lng: number | null }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return resolve({ lat: null, lng: null });
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export function JobCard({ token, job }: { token: string; job: TechJob }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [gpsNote, setGpsNote] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  };

  const onReached = async () => {
    setBusy(true);
    setErr(null);
    const g = await getGps();
    await run(() => techReached(token, job.id, g.lat, g.lng));
  };

  const onWorkDone = async () => {
    setBusy(true);
    setGpsNote("Getting your location…");
    const g = await getGps();
    setCoords(g);
    setGpsNote(g.lat ? "Location captured ✓" : "Location unavailable — continuing without GPS.");
    setShowUpload(true);
    setBusy(false);
  };

  const lead = job.lead;
  const title = lead ? `${lead.customer_name} — ${lead.request_type}` : "Job";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold capitalize text-slate-900">{title}</h2>
        {lead && (
          <div className="mt-1 space-y-1 text-sm text-slate-600">
            <div>📍 {lead.area ?? lead.address ?? "—"}</div>
            <div>📞 {lead.phone}</div>
            {lead.product_details && <div>🔧 {lead.product_details}</div>}
            {lead.customer_remarks && (
              <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                {lead.customer_remarks}
              </div>
            )}
          </div>
        )}
      </div>

      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}

      {job.status === "assigned_pending" && (
        <div>
          {job.accept_deadline && (
            <p className="mb-2 text-xs font-medium text-purple-700">
              ⏱ Please respond by{" "}
              {new Date(job.accept_deadline).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => run(() => techAccept(token, job.id))}
              className="flex-1 rounded-xl bg-green-600 py-3 font-medium text-white disabled:opacity-50"
            >
              ✅ Accept
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => techReject(token, job.id))}
              className="flex-1 rounded-xl border border-red-300 py-3 font-medium text-red-600 disabled:opacity-50"
            >
              ❌ Reject
            </button>
          </div>
        </div>
      )}

      {job.status === "accepted" && (
        <button
          disabled={busy}
          onClick={onReached}
          className="w-full rounded-xl bg-cyan-600 py-3 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Getting location…" : "📍 I've Reached"}
        </button>
      )}

      {(job.status === "reached" || job.status === "working") && !showUpload && (
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={onWorkDone}
            className="flex-1 rounded-xl bg-blue-600 py-3 font-medium text-white disabled:opacity-50"
          >
            ✅ Work Done
          </button>
          <button
            disabled={busy}
            onClick={() => run(() => techCancel(token, job.id))}
            className="flex-1 rounded-xl border border-red-300 py-3 font-medium text-red-600 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}

      {showUpload && (
        <form action={techComplete} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="job_id" value={job.id} />
          <input type="hidden" name="lat" value={coords.lat ?? ""} />
          <input type="hidden" name="lng" value={coords.lng ?? ""} />
          {gpsNote && <p className="text-xs text-slate-500">{gpsNote}</p>}

          <FileField label="📷 Work completion photos" name="photos" multiple required />
          <FileField label="🧾 Bill copy" name="bill" />
          <FileField label="🔢 Serial number photo" name="serial" />

          <SubmitButton />
        </form>
      )}
    </div>
  );
}

function FileField({
  label,
  name,
  multiple,
  required,
}: {
  label: string;
  name: string;
  multiple?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="file"
        name={name}
        accept="image/*"
        multiple={multiple}
        required={required}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
      />
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-xl bg-slate-900 py-3 font-medium text-white disabled:opacity-50"
    >
      {pending ? "Uploading…" : "Submit & Complete Job"}
    </button>
  );
}
