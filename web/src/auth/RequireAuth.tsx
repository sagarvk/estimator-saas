import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

export default function RequireAuth({ children }: { children: any }) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [profileComplete, setProfileComplete] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        setAuthed(false);
        setChecking(false);
        return;
      }

      setAuthed(true);

      try {
        const resp = await api("/api/profile"); // returns { profile, is_complete }
        setProfileComplete(!!resp.is_complete);
      } catch {
        // if profile endpoint fails, allow app but you can also force /profile
        setProfileComplete(true);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) return null; // you can show loader
  if (!authed) return <Navigate to="/signin" state={{ from: location }} replace />;

  // Allow profile page always
  if (!profileComplete && location.pathname !== "/profile") {
    return <Navigate to="/profile" replace />;
  }

  return children;
}
