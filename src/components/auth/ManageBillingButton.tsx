"use client";

import { useState } from "react";

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/5 disabled:opacity-50"
    >
      {loading ? "Loading…" : "Manage Billing"}
    </button>
  );
}
