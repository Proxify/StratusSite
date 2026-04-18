"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SubscribeButtonProps {
  className?: string;
  children?: React.ReactNode;
  isAuthenticated: boolean;
}

export function SubscribeButton({
  className,
  children = "Get Started",
  isAuthenticated,
}: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!isAuthenticated) {
      router.push("/auth/signin?callbackUrl=/pricing");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
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
      className={className}
    >
      {loading ? "Redirecting to checkout…" : children}
    </button>
  );
}
