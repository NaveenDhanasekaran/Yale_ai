"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { submitCustomerDocs } from "./actions";

export function CustomerForm({
  token,
  requestType,
}: {
  token: string;
  requestType: "installation" | "breakdown";
}) {
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [locNote, setLocNote] = useState<string | null>(null);
  const isInstall = requestType === "installation";

  const shareLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocNote("Location not supported on this device — paste a Google Maps link instead.");
      return;
    }
    setLocNote("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocNote(
          `Location captured ✓ (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`
        );
      },
      () => setLocNote("Couldn't get location — you can paste a Google Maps link instead."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <form action={submitCustomerDocs} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="lat" value={coords.lat ?? ""} />
      <input type="hidden" name="lng" value={coords.lng ?? ""} />

      {isInstall ? (
        <>
          <FileField label="📄 Invoice copy" name="invoice" />
          <FileField label="📷 Photo of the door" name="media" multiple required />
        </>
      ) : (
        <>
          <TextArea label="🔧 What is the problem?" name="issue_description" required />
          <FileField
            label="📷 Photos / videos of the issue"
            name="media"
            multiple
            required
            accept="image/*,video/*"
          />
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="📅 Preferred date" name="preferred_date" type="date" required />
        <Field label="⏰ Preferred time" name="preferred_time" type="time" />
      </div>

      <TextArea label="📝 Anything else? (optional)" name="notes" />

      <div className="rounded-xl border border-slate-200 p-3">
        <p className="mb-2 text-sm font-medium text-slate-700">
          📍 Your location (helps us send the nearest technician)
        </p>
        <button
          type="button"
          onClick={shareLocation}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Share my location
        </button>
        {locNote && <p className="mt-2 text-xs text-slate-600">{locNote}</p>}
        <input
          name="map_url"
          placeholder="…or paste a Google Maps link"
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <SubmitButton />
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  required,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        name={name}
        required={required}
        rows={3}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

function FileField({
  label,
  name,
  multiple,
  required,
  accept = "image/*",
}: {
  label: string;
  name: string;
  multiple?: boolean;
  required?: boolean;
  accept?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="file"
        name={name}
        accept={accept}
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
      {pending ? "Submitting…" : "Submit details"}
    </button>
  );
}
