import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserSubscription } from "@/lib/db";
import Link from "next/link";
import { ManageBillingButton } from "@/components/auth/ManageBillingButton";

export const metadata = {
  title: "Dashboard — Stratus Software",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const params = await searchParams;
  const subscription = await getUserSubscription(session.user.id);

  const tools = [
    {
      href: "/app/hmi-insight",
      name: "HMI Insight",
      desc: "Convert Honeywell Experion .htm graphics to images and PDF.",
      icon: "⬡",
    },
    {
      href: "/app/deltav-render",
      name: "DeltaV Render",
      desc: "Convert Emerson DeltaV Live .di.ahc graphics to images and PDF.",
      icon: "◈",
    },
  ];

  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {params.success && (
          <div className="mb-8 rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-4 text-sm text-green-400">
            ✓ Subscription activated — you now have full platform access.
          </div>
        )}

        <div className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-1 text-muted">
              Welcome back, {session.user.name?.split(" ")[0]}
            </p>
          </div>
          <ManageBillingButton />
        </div>

        {/* Subscription status */}
        <div className="mb-10 rounded-xl border border-white/10 bg-navy-light p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Plan</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {subscription ? "Stratus Platform" : "No active subscription"}
              </p>
            </div>
            {subscription ? (
              <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-400">
                Active
              </span>
            ) : (
              <Link
                href="/pricing"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Subscribe
              </Link>
            )}
          </div>
          {subscription && (
            <p className="mt-3 text-sm text-muted">
              Renews{" "}
              {new Date(subscription.current_period_end).toLocaleDateString(
                "en-US",
                { month: "long", day: "numeric", year: "numeric" }
              )}
            </p>
          )}
        </div>

        {/* Tools */}
        {subscription && (
          <>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Your Tools
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {tools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group rounded-xl border border-white/10 bg-navy-light p-6 transition-colors hover:border-accent/40"
                >
                  <div className="mb-3 text-2xl">{tool.icon}</div>
                  <h3 className="font-semibold text-white group-hover:text-accent">
                    {tool.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{tool.desc}</p>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="text-sm text-muted">
            Signed in as{" "}
            <span className="text-white">{session.user.email}</span>
          </p>
        </div>
      </div>
    </main>
  );
}
