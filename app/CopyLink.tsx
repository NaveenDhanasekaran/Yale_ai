"use client";

import { useState } from "react";

/** Copies `${origin}${prefix}${token}` to the clipboard. */
export function CopyLink({
  token,
  prefix,
  label,
}: {
  token: string | null;
  prefix: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  if (!token) return <span className="text-xs text-slate-400">—</span>;

  const copy = async () => {
    const url = `${window.location.origin}${prefix}${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link:", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={copy}
      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
