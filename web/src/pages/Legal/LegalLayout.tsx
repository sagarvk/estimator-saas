import { Link } from "react-router";

function Container({ children }) {
  return <div className="mx-auto w-full max-w-4xl px-4">{children}</div>;
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" className="fill-current">
          <path d="M3 3h18v4H3V3zm0 7h18v4H3v-4zm0 7h18v4H3v-4z" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-base font-semibold text-black dark:text-white">EstimatorPro</div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400">Legal</div>
      </div>
    </Link>
  );
}

export default function LegalLayout({ title, updatedAt, children }) {
  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0b1220]">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-stroke bg-white/80 backdrop-blur dark:border-strokedark dark:bg-boxdark/50">
        <Container>
          <div className="flex items-center justify-between py-4">
            <Logo />
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

      <Container>
        <div className="py-10">
          <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-black dark:text-white">{title}</h1>
              {updatedAt ? (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Last updated: {updatedAt}
                </div>
              ) : null}
            </div>

            <div className="prose max-w-none prose-sm prose-headings:text-black prose-p:text-gray-700 dark:prose-invert dark:prose-headings:text-white dark:prose-p:text-gray-300">
              {children}
            </div>
          </div>

          {/* Footer links */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div>© {new Date().getFullYear()} EstimatorPro</div>
            <div className="flex flex-wrap gap-4">
              <Link className="hover:text-black dark:hover:text-white" to="/terms">
                Terms & Conditions
              </Link>
              <Link className="hover:text-black dark:hover:text-white" to="/refund">
                Cancellation & Refund Policy
              </Link>
              <Link className="hover:text-black dark:hover:text-white" to="/shipping">
                Shipping & Delivery Policy
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
