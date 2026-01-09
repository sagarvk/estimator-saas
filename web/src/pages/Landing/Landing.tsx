import { Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; // ✅ adjust path if your supabase client file differs
import { Helmet } from "react-helmet-async";

function Container({ children }) {
  return <div className="mx-auto w-full max-w-6xl px-4">{children}</div>;
}

function Logo() {
  return (
    
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" className="fill-current">
          <path d="M3 3h18v4H3V3zm0 7h18v4H3v-4zm0 7h18v4H3v-4z" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-base font-semibold text-black dark:text-white">EstimatorPro</div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          Estimates in minutes
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, desc }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow ? (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-2xl font-semibold text-black dark:text-white sm:text-3xl">
        {title}
      </h2>
      {desc ? (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{desc}</p>
      ) : null}
    </div>
  );
}

function Feature({ title, desc, icon }) {
  return (
    <div className="rounded-2xl border border-stroke bg-white p-5 shadow-sm dark:border-strokedark dark:bg-boxdark">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5">
        {icon}
      </div>
      <div className="text-base font-semibold text-black dark:text-white">{title}</div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{desc}</p>
    </div>
  );
}

export default function Landing() {
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

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
    <>
    <Helmet>
        <title>EstimatorPro — Construction Estimates in Minutes</title>
        <meta
            name="description"
            content="EstimatorPro helps Civil Engineers & Architects generate accurate construction estimate PDFs with GST breakup, project types, quality rates, and rule-based items like water tank capacity."
        />
        <meta property="og:title" content="EstimatorPro — Construction Estimates in Minutes" />
        <meta
            property="og:description"
            content="Generate accurate estimate PDFs with GST breakup, project types, quality rates, and smart rules."
        />
    </Helmet>

      <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0b1220]">
              {/* Top bar */}

              <div className="sticky top-0 z-40 border-b border-stroke bg-white/80 backdrop-blur dark:border-strokedark dark:bg-boxdark/50">
                  <Container>
                      <div className="flex items-center justify-between py-4">
                          <Logo />

                          <div className="hidden items-center gap-8 md:flex">
                              <a
                                  href="#features"
                                  className="text-sm text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                              >
                                  Features
                              </a>
                              <a
                                  href="#how"
                                  className="text-sm text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                              >
                                  How it works
                              </a>
                              <a
                                  href="#pricing"
                                  className="text-sm text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                              >
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

              {/* Hero */}
              <Container>
                  <div className="py-12">
                      <div className="mx-auto max-w-3xl text-center">
                          <div className="inline-flex items-center gap-2 rounded-full border border-stroke bg-white px-3 py-1 text-xs text-gray-600 dark:border-strokedark dark:bg-boxdark dark:text-gray-300">
                              <span className="relative">
                                  <span className="absolute right-[-2px] top-[-2px] z-10 h-2 w-2 rounded-full bg-orange-400">
                                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                                  </span>
                              </span>
                              Fast Estimates • PDF Download • GST Included
                          </div>

                          <h1 className="mt-4 text-3xl font-semibold text-black dark:text-white sm:text-4xl">
                              Create construction estimates in minutes — not hours.
                          </h1>

                          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                              EstimatorPro is designed for Civil Engineers and Architects who need clear, professional, and reliable estimate documents—without wasting time on repetitive calculations or manual formatting. 
                          </p>
                          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                            Whether you’re preparing estimates for bank loan approvals, project submissions, or client documentation, EstimatorPro helps you generate clean, structured PDF estimates that look authoritative and are ready to share instantly.
                          </p>
                         
                          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                            From sign-up to submission in minutes—complete your profile, add your letterhead, signature, and seal, and generate professional estimates instantly.
                          </p>

                          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                              <Link
                                  to="/signup"
                                  className="inline-flex items-center justify-center rounded-lg border border-stroke bg-white px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-gray-200 dark:hover:bg-white/5"
                              >
                                  Get started free
                              </Link>
                              <Link
                                  to="/signin"
                                  className="inline-flex items-center justify-center rounded-lg border border-stroke bg-white px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-gray-200 dark:hover:bg-white/5"
                              >
                                  I already have an account
                              </Link>
                          </div>

                          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <span className="rounded-full border border-stroke bg-white px-3 py-1 dark:border-strokedark dark:bg-boxdark">
                                  ✅ GST breakup
                              </span>
                              <span className="rounded-full border border-stroke bg-white px-3 py-1 dark:border-strokedark dark:bg-boxdark">
                                  ✅ Project types & qualities
                              </span>
                              <span className="rounded-full border border-stroke bg-white px-3 py-1 dark:border-strokedark dark:bg-boxdark">
                                  ✅ Download PDF after payment
                              </span>
                          </div>
                      </div>
                  </div>
              </Container>

              {/* Features */}
              <div id="features" className="py-12">
                  <Container>
                      <SectionTitle
                          eyebrow="Features"
                          title="Everything you need for quick estimate PDFs"
                          desc="Built for real on-site work: fast inputs, correct breakup, clean PDF output." />

                      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <Feature
                              title="Accurate Estimates"
                              desc="Estimates generated are accurate and match industry standarads."
                              icon={<svg width="18" height="18" viewBox="0 0 24 24" className="fill-current text-gray-700 dark:text-gray-200">
                                  <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
                              </svg>} />
                          <Feature
                              title="Lettehead, Sign & Seal"
                              desc="Estimates generated have letterhead, sign and seal of your name / firm which is handy for sharing instantly."
                              icon={<svg width="18" height="18" viewBox="0 0 24 24" className="fill-current text-gray-700 dark:text-gray-200">
                                  <path d="M12 2l9 4v6c0 5-3.8 9.7-9 10-5.2-.3-9-5-9-10V6l9-4z" />
                              </svg>} />
                          <Feature
                              title="History & downloads"
                              desc="Paid estimates are saved with PDF path and can be downloaded anytime from history."
                              icon={<svg width="18" height="18" viewBox="0 0 24 24" className="fill-current text-gray-700 dark:text-gray-200">
                                  <path d="M13 3a9 9 0 109 9h-2a7 7 0 11-7-7V3z" />
                              </svg>} />
                          <Feature
                              title="Project Types"
                              desc="Residential, bungalow, commercial, sheds — each with its own description set & charges."
                              icon={<svg width="18" height="18" viewBox="0 0 24 24" className="fill-current text-gray-700 dark:text-gray-200">
                                  <path d="M4 10l8-6 8 6v10H4V10z" />
                              </svg>} />
                          <Feature
                              title="Quality Rates"
                              desc="Premium/Standard rates per sq.ft. drive the basis for estimate generation."
                              icon={<svg width="18" height="18" viewBox="0 0 24 24" className="fill-current text-gray-700 dark:text-gray-200">
                                  <path d="M12 2l3 7h7l-5.5 4.2L18.5 21 12 16.8 5.5 21l2-7.8L2 9h7l3-7z" />
                              </svg>} />
                          <Feature
                              title="Payment + PDF"
                              desc="Payment flow: Pay → Confirm → Generate PDF → signed URL download."
                              icon={<svg width="18" height="18" viewBox="0 0 24 24" className="fill-current text-gray-700 dark:text-gray-200">
                                  <path d="M21 7H3V5h18v2zm0 4H3v8h18v-8zM7 16h4v2H7v-2z" />
                              </svg>} />
                      </div>
                  </Container>
              </div>

              {/* How it works */}
              <div id="how" className="py-12">
                  <Container>
                      <SectionTitle
                          eyebrow="How it works"
                          title="3 steps to a ready PDF"
                          desc="Simple flow, same as your current app — just more welcoming for new users." />

                      <div className="mt-8 grid gap-4 md:grid-cols-3">
                          {[
                              ["Enter project details", "Client, address, built-up area, project type & quality."],
                              ["Preview breakup", "See subtotal, GST, and calculated items instantly."],
                              ["Pay & download", "Complete payment and download the PDF."],
                          ].map(([t, d], idx) => (
                              <div
                                  key={t}
                                  className="rounded-2xl border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark"
                              >
                                  <div className="mb-3 flex items-center gap-3">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white">
                                          {idx + 1}
                                      </div>
                                      <div className="text-base font-semibold text-black dark:text-white">{t}</div>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{d}</p>
                              </div>
                          ))}
                      </div>
                  </Container>
              </div>

              {/* Pricing */}
              <div id="pricing" className="py-12">
                  <Container>
                      <SectionTitle
                          eyebrow="Pricing"
                          title="Pay Per Estimate"
                          desc="Simple pricing that matches your current Razorpay setup." />

                      <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-stroke bg-white p-6 text-center dark:border-strokedark dark:bg-boxdark">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Per Estimate</div>
                          <div className="mt-2 text-4xl font-semibold text-black dark:text-white">₹499</div>
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              * Final price can be configured from settings.
                          </div>

                          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                              <Link
                                  to="/signup"
                                  className="rounded-lg border border-stroke bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-gray-200 dark:hover:bg-white/5"
                              >
                                  Create account
                              </Link>
                              <Link
                                  to="/signin"
                                  className="rounded-lg border border-stroke bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-gray-200 dark:hover:bg-white/5"
                              >
                                  Sign in
                              </Link>
                          </div>
                      </div>
                  </Container>
              </div>

              {/* Footer */}
              <div className="border-t border-stroke py-8 dark:border-strokedark">
                  <Container>
                      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                              © {new Date().getFullYear()} EstimatorPro. All rights reserved.
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                              <Link className="hover:text-black dark:hover:text-white" to="/terms">
                                  Terms & Conditions
                              </Link>
                              <Link className="hover:text-black dark:hover:text-white" to="/privacy">
                                  Privacy Policy
                              </Link>
                              <Link className="hover:text-black dark:hover:text-white" to="/refund">
                                  Cancellation & Refund Policy
                              </Link>
                              <Link className="hover:text-black dark:hover:text-white" to="/shipping">
                                  Shipping & Delivery Policy
                              </Link>
                              <Link className="hover:text-black dark:hover:text-white" to="/contact">
                                  Contact Us
                              </Link>
                              <span className="hidden sm:inline">•</span>
                              <Link className="hover:text-black dark:hover:text-white" to="/signin">
                                  Sign in
                              </Link>
                              <Link className="hover:text-black dark:hover:text-white" to="/signup">
                                  Sign up
                              </Link>
                          </div>
                      </div>
                  </Container>
              </div>
          </div></>
  );
}
