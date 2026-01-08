import { Link, Navigate } from "react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; // adjust if needed

function Container({ children }) {
  return <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>;
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-primary text-white">
        <span className="absolute inset-0 opacity-40 blur-2xl bg-white" />
        <svg width="18" height="18" viewBox="0 0 24 24" className="relative fill-current">
          <path d="M4 4h16v4H4V4zm0 6h16v6H4v-6zm0 8h10v2H4v-2z" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-base font-semibold text-black dark:text-white">EstimatorPro</div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400">For Civil Engineers & Architects</div>
      </div>
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-stroke bg-white/70 px-3 py-1 text-xs text-gray-700 backdrop-blur dark:border-strokedark dark:bg-white/5 dark:text-gray-200">
      {children}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-black dark:text-white">{value}</div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="group rounded-2xl border border-stroke bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-strokedark dark:bg-boxdark">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-200">
        {icon}
      </div>
      <div className="text-base font-semibold text-black dark:text-white">{title}</div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{desc}</p>
      <div className="mt-4 h-[3px] w-0 rounded-full bg-primary transition-all duration-300 group-hover:w-12" />
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</div>
      ) : null}
      <h2 className="text-2xl font-semibold text-black dark:text-white sm:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p> : null}
    </div>
  );
}

export default function Landing() {
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  // Redirect logged-in users to /app
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setIsAuthed(!!data?.session);
      } finally {
        if (mounted) setChecking(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(!!session);
      setChecking(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (!checking && isAuthed) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0b1220]">
      {/* ===== Decorative background (TailAdmin-ish glow) ===== */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      {/* ===== Navbar ===== */}
      <div className="sticky top-0 z-40 border-b border-stroke bg-white/70 backdrop-blur dark:border-strokedark dark:bg-boxdark/50">
        <Container>
          <div className="flex items-center justify-between py-4">
            <Logo />

            <div className="hidden items-center gap-8 md:flex">
              <a href="#features" className="text-sm text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white">
                Features
              </a>
              <a href="#how" className="text-sm text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white">
                How it works
              </a>
              <a href="#pricing" className="text-sm text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white">
                Pricing
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/signin"
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Sign up
              </Link>
            </div>
          </div>
        </Container>
      </div>

      {/* ===== Hero ===== */}
      <Container>
        <div className="grid gap-10 py-12 md:grid-cols-2 md:items-center lg:py-16">
          {/* Left */}
          <div>
            <div className="flex flex-wrap gap-2">
              <Pill>
                <span className="relative mr-2 inline-flex">
                  <span className="absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                  </span>
                  <span className="h-2 w-2 rounded-full bg-orange-400" />
                </span>
                Fast estimates • Clean PDF • GST breakup
              </Pill>
              <Pill>Rule-based items (Water Tank, etc.)</Pill>
              <Pill>Project types & quality rates</Pill>
            </div>

            <h1 className="mt-5 text-3xl font-semibold leading-tight text-black dark:text-white sm:text-4xl">
              Professional construction estimates —
              <span className="text-primary"> ready in minutes.</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-400">
              EstimatorPro generates accurate estimate breakups using your standard percentage model,
              reverse GST logic, project-type charges and rule-based quantities — then creates a clean
              downloadable PDF for clients.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90"
              >
                Get started
                <svg className="ml-2" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>

              <Link
                to="/signin"
                className="inline-flex items-center justify-center rounded-lg border border-stroke bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-gray-200 dark:hover:bg-white/5"
              >
                Sign in
              </Link>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                Built for <b>Civil Engineers</b> & <b>Architects</b>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Estimate time" value="2–5 minutes" />
              <Stat label="Auto breakup" value="100% consistent" />
              <Stat label="PDF download" value="Instant" />
            </div>
          </div>

          {/* Right (preview cards) */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-primary/10 via-indigo-400/10 to-cyan-400/10 blur-2xl" />

            <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-black dark:text-white">Estimate Preview</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Example breakup</div>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-200">
                  GST Ready
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  ["Built-up Area", "1200 sq.ft"],
                  ["Quality", "Premium • ₹1800/sq.ft"],
                  ["Total (Incl. GST)", "₹21,60,000"],
                  ["GST @18%", "₹3,29,491.55"],
                  ["Subtotal (Excl. GST)", "₹18,30,508.47"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded-xl border border-stroke px-4 py-3 dark:border-strokedark"
                  >
                    <div className="text-xs text-gray-600 dark:text-gray-300">{k}</div>
                    <div className="text-sm font-semibold text-black dark:text-white">{v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4 text-xs text-gray-700 dark:bg-white/5 dark:text-gray-200">
                  <div className="font-semibold">Rule-based FIXED_QTY</div>
                  <div className="mt-1 text-gray-600 dark:text-gray-400">
                    Water tank litres auto-picked by built-up area.
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 text-xs text-gray-700 dark:bg-white/5 dark:text-gray-200">
                  <div className="font-semibold">Charges per project type</div>
                  <div className="mt-1 text-gray-600 dark:text-gray-400">
                    Contingencies & Electrification as configured.
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-white/20" />
                <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-white/20" />
                <div className="h-2 w-8 rounded-full bg-primary" />
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-6 left-6 rounded-2xl border border-stroke bg-white px-4 py-3 text-xs shadow-sm dark:border-strokedark dark:bg-boxdark">
              <div className="font-semibold text-black dark:text-white">Accurate breakup</div>
              <div className="text-gray-500 dark:text-gray-400">Matches your reverse-GST formula</div>
            </div>
          </div>
        </div>
      </Container>

      {/* ===== Features ===== */}
      <div id="features" className="py-14">
        <Container>
          <SectionHeading
            eyebrow="Features"
            title="Tailored for your daily estimating workflow"
            subtitle="Set your masters once and generate consistent estimates across project types."
          />

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Reverse GST logic"
              desc="BASE = area×rate, split GST, compute subtotal, then compute items accurately."
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" className="fill-current">
                  <path d="M5 3h14v4H5V3zm0 6h14v6H5V9zm0 8h8v4H5v-4z" />
                </svg>
              }
            />
            <FeatureCard
              title="Rule-based quantities"
              desc="Use qty_rule_json for FIXED_QTY items like water tank litres by built-up area."
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" className="fill-current">
                  <path d="M12 2l9 4v6c0 5-3.8 9.7-9 10-5.2-.3-9-5-9-10V6l9-4z" />
                </svg>
              }
            />
            <FeatureCard
              title="Project type masters"
              desc="Different descriptions & charges for bungalow, building, commercial, sheds."
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" className="fill-current">
                  <path d="M4 10l8-6 8 6v10H4V10z" />
                </svg>
              }
            />
            <FeatureCard
              title="Clean PDF output"
              desc="Letterhead + sign/seal support with professional estimate formatting."
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" className="fill-current">
                  <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1v5h5" />
                </svg>
              }
            />
            <FeatureCard
              title="Razorpay pay-per-estimate"
              desc="Simple flow: preview → pay → confirm → signed download URL."
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" className="fill-current">
                  <path d="M21 7H3V5h18v2zm0 4H3v8h18v-8zM7 16h4v2H7v-2z" />
                </svg>
              }
            />
            <FeatureCard
              title="History & re-download"
              desc="All paid estimates saved and accessible in one click."
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" className="fill-current">
                  <path d="M12 8v5l4 2M3 12a9 9 0 1 0 9-9v3" />
                </svg>
              }
            />
          </div>
        </Container>
      </div>

      {/* ===== How it works ===== */}
      <div id="how" className="py-14">
        <Container>
          <SectionHeading
            eyebrow="How it works"
            title="3 steps to a ready estimate PDF"
            subtitle="A simple flow designed for speed."
          />

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {[
              {
                t: "Enter project details",
                d: "Client, site address, built-up area, project type and quality rate.",
              },
              {
                t: "Preview breakup",
                d: "See subtotal, items, charges, GST and final total instantly.",
              },
              {
                t: "Pay & Download PDF",
                d: "Complete Razorpay payment and download the PDF.",
              },
            ].map((s, i) => (
              <div
                key={s.t}
                className="relative rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white">
                    {i + 1}
                  </div>
                  <div className="text-base font-semibold text-black dark:text-white">{s.t}</div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{s.d}</p>

                <div className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-primary">
                  Learn more
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* ===== Pricing + CTA ===== */}
      <div id="pricing" className="py-14">
        <Container>
          <SectionHeading
            eyebrow="Pricing"
            title="Simple pay-per-estimate pricing"
            subtitle="No monthly lock-in. Pay only when you generate & download."
          />

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-stroke bg-white p-8 shadow-sm dark:border-strokedark dark:bg-boxdark">
              <div className="text-sm font-semibold text-black dark:text-white">Pay per estimate</div>
              <div className="mt-2 flex items-end justify-center gap-2 lg:justify-start">
                <div className="text-4xl font-semibold text-black dark:text-white">₹399</div>
                <div className="pb-1 text-xs text-gray-500 dark:text-gray-400">/ estimate</div>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                {[
                  "Unlimited previews",
                  "Download PDF after payment",
                  "Rule-based quantities support",
                  "Saved history & re-download",
                ].map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-200">
                      ✓
                    </span>
                    {x}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Create account
                </Link>
                <Link
                  to="/signin"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-stroke bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-gray-200 dark:hover:bg-white/5"
                >
                  Sign in
                </Link>
              </div>

              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                * Price can be configured from app settings.
              </div>
            </div>

            {/* CTA block */}
            <div className="rounded-2xl border border-stroke bg-gradient-to-br from-primary/10 via-indigo-400/10 to-cyan-400/10 p-8 dark:border-strokedark">
              <div className="rounded-2xl bg-white/70 p-6 backdrop-blur dark:bg-boxdark/60">
                <div className="text-sm font-semibold text-black dark:text-white">Ready to generate your first estimate?</div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Start with your logo, letterhead and sign/seal. Then generate professional PDFs for clients in minutes.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-stroke bg-white p-4 text-xs dark:border-strokedark dark:bg-boxdark">
                    <div className="font-semibold text-black dark:text-white">Fast setup</div>
                    <div className="mt-1 text-gray-500 dark:text-gray-400">Add profile + assets once</div>
                  </div>
                  <div className="rounded-xl border border-stroke bg-white p-4 text-xs dark:border-strokedark dark:bg-boxdark">
                    <div className="font-semibold text-black dark:text-white">Consistent results</div>
                    <div className="mt-1 text-gray-500 dark:text-gray-400">Same breakup every time</div>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    to="/signup"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    Get started now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* ===== Footer ===== */}
      <div className="border-t border-stroke py-10 dark:border-strokedark">
        <Container>
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} EstimatorPro. All rights reserved.
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <a href="#features" className="hover:text-black dark:hover:text-white">Features</a>
              <a href="#how" className="hover:text-black dark:hover:text-white">How it works</a>
              <a href="#pricing" className="hover:text-black dark:hover:text-white">Pricing</a>
              <Link to="/signin" className="hover:text-black dark:hover:text-white">Sign in</Link>
              <Link to="/signup" className="hover:text-black dark:hover:text-white">Sign up</Link>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}
