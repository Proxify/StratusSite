"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const errors: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The sign-in link has expired or already been used.",
  Default: "An error occurred. Please try again.",
};

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error") ?? "Default";
  const message = errors[error] ?? errors.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-white">Sign-in Error</h1>
        <p className="mt-4 text-muted">{message}</p>
        <Link
          href="/auth/signin"
          className="mt-8 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
