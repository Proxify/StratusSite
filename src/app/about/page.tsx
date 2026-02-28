import { FadeInSection } from "@/components/FadeInSection";

export const metadata = {
  title: "About — Stratus Software",
  description:
    "Learn about Stratus Software and our mission to modernize industrial automation.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <FadeInSection>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              About Stratus
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
              We build the tools that DCS engineers wish they had a decade ago.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Story */}
      <section className="bg-surface px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <FadeInSection>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Our Story
            </h2>
            <div className="mt-8 space-y-6 text-lg leading-relaxed text-gray-600">
              <p>
                Stratus Software was born from a simple frustration: the
                disconnect between modern software development practices and the
                industrial automation world. While web apps got sleeker and
                faster, DCS engineers were still stuck with manual documentation
                processes, proprietary viewers, and tedious workflows.
              </p>
              <p>
                Founded by engineers who have spent years working with Honeywell
                Experion, TDC, and Emerson DeltaV systems, Stratus bridges that
                gap. We understand the real challenges because we&apos;ve lived
                them — managing thousands of graphic displays, producing
                documentation under tight turnaround deadlines, and navigating
                complex configuration files.
              </p>
              <p>
                Our suite of tools is purpose-built for this world. No generic
                compromises. No unnecessary complexity. Just powerful,
                focused software that makes your job easier.
              </p>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-navy-light px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <FadeInSection>
            <h2 className="text-3xl font-bold tracking-tight">Our Mission</h2>
            <p className="mt-6 text-lg text-muted">
              To modernize the toolchain for industrial automation
              engineers — bringing the speed, reliability, and user experience of
              modern SaaS to the DCS world, without losing the domain expertise
              that matters.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Values */}
      <section className="bg-navy px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <FadeInSection>
            <h2 className="text-center text-3xl font-bold tracking-tight">
              What We Stand For
            </h2>
          </FadeInSection>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Domain Expertise",
                description:
                  "Built by DCS engineers, for DCS engineers. We speak your language and solve your actual problems.",
              },
              {
                title: "Simplicity",
                description:
                  "Complex problems deserve simple solutions. Our tools are powerful but never complicated.",
              },
              {
                title: "Reliability",
                description:
                  "Industrial projects demand tools that work every time. We build software you can count on.",
              },
            ].map((value, i) => (
              <FadeInSection
                key={value.title}
                delay={
                  i === 0
                    ? ""
                    : i === 1
                      ? "animate-delay-100"
                      : "animate-delay-200"
                }
              >
                <div className="rounded-2xl border border-white/10 p-8">
                  <h3 className="text-xl font-bold">{value.title}</h3>
                  <p className="mt-3 text-muted">{value.description}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
