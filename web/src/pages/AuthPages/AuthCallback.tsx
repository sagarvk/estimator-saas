import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const ran = useRef(false);
  const [msg, setMsg] = useState("Signing you in...");

  useEffect(() => {
    if (ran.current) return; // prevent double-run (React StrictMode)
    ran.current = true;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const err = url.searchParams.get("error_description");

        if (err) {
          console.error("OAuth error:", err);
          setMsg(err);
          navigate("/signin", { replace: true });
          return;
        }

        // ✅ If there is no code, don't call exchangeCodeForSession
        if (!code) {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            navigate("/app", { replace: true });
          } else {
            navigate("/signin", { replace: true });
          }
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error("exchangeCodeForSession error:", error);
          navigate("/signin", { replace: true });
          return;
        }

        navigate("/app", { replace: true });
      } catch (e: any) {
        console.error("AuthCallback crash:", e);
        setMsg(e?.message || "Login failed");
        navigate("/signin", { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-sm text-gray-500">{msg}</div>
    </div>
  );
}
