"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function UserMenu({ name, email, image }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white hover:bg-accent-hover focus:outline-none"
        aria-label="User menu"
      >
        {image ? (
          <img
            src={image}
            alt={name ?? "User"}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-navy-light py-1 shadow-xl">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-sm font-medium text-white truncate">{name}</p>
            <p className="text-xs text-muted truncate">{email}</p>
          </div>

          <Link
            href="/dashboard"
            className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/app"
            className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Tools
          </Link>

          <div className="border-t border-white/10 mt-1">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="block w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
