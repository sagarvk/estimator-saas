import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

export default function RequireAuth({ children }: { children: any }) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [profileComplete, setProfileComplete] = useState(true);

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data?.session ?? null);
      setChecking(false);

      // profile check in background (don’t block routing)
      if (data?.session) {
        try {
          const resp = await api("/api/profile");
          if (!mounted) return;
          setProfileComplete(!!resp.is_complete);
        } catch {
          if (!mounted) return;
          setProfileComplete(true);
        }
      }
    };

    syncSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s ?? null);
      setChecking(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Checking session...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (!profileComplete && location.pathname !== "/app/profile") {
    return <Navigate to="/app/profile" replace />;
  }

  return children;
}
