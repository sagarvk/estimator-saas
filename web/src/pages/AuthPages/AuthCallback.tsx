import { useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  

  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      if (error) {
        console.error("exchangeCodeForSession error:", error);
        navigate("/signin", { replace: true });
        return;
      }

      navigate("/", { replace: true });
    };

    run();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-sm text-gray-500">Signing you in...</div>
    </div>
  );
}
