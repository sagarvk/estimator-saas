import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { supabase } from "../../lib/supabase";

export default function ChangePassword() {
  const navigate = useNavigate();

  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // Must be logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data?.session) navigate("/signin", { replace: true });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate("/signin", { replace: true });
    });

    return () => sub?.subscription?.unsubscribe();
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setOkMsg("");

    if (!password) return setErrorMsg("Please enter new password.");
    if (password.length < 6) return setErrorMsg("Password must be at least 6 characters.");
    if (password !== confirm) return setErrorMsg("Passwords do not match.");

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setOkMsg("Password changed successfully.");
      setPassword("");
      setConfirm("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="mb-5">
        <h3 className="text-xl font-semibold text-black dark:text-white">Change Password</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Update your password for better security.
        </p>
      </div>

      {errorMsg ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {errorMsg}
        </div>
      ) : null}

      {okMsg ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200">
          {okMsg}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="max-w-lg">
        <div className="space-y-6">
          <div>
            <Label>
              New Password <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={show1 ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <span
                onClick={() => setShow1(!show1)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
              >
                {show1 ? (
                  <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                ) : (
                  <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                )}
              </span>
            </div>
          </div>

          <div>
            <Label>
              Confirm Password <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={show2 ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
              />
              <span
                onClick={() => setShow2(!show2)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
              >
                {show2 ? (
                  <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                ) : (
                  <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                )}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Saving..." : "Update Password"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => {
                setPassword("");
                setConfirm("");
                setErrorMsg("");
                setOkMsg("");
              }}
              className="w-full sm:w-auto"
            >
              Clear
            </Button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            
          </div>
        </div>
      </form>
    </div>
  );
}
