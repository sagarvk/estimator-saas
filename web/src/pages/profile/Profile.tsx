import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { api } from "../../lib/api";

function FilePicker({
  label,
  file,
  onPick,
  onClear,
  accept = "image/png",
  hint,
}: any) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-lg border border-stroke p-4 dark:border-strokedark">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-black dark:text-white">{label}</div>
          {hint ? <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</div> : null}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            Choose PNG
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!file}
            onClick={onClear}
          >
            Remove
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-600 dark:text-gray-300">
          {file ? (
            <>
              Selected: <span className="font-semibold">{file.name}</span>{" "}
              <span className="text-gray-400">({Math.round(file.size / 1024)} KB)</span>
            </>
          ) : (
            <span className="text-gray-400">No file selected</span>
          )}
        </div>

        {file ? (
          <img
            src={URL.createObjectURL(file)}
            alt="preview"
            className="h-10 w-24 rounded border border-stroke object-contain p-1 dark:border-strokedark"
          />
        ) : null}
      </div>
    </div>
  );
}

function validatePng(file: File, label: string) {
  const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
  if (!isPng) return `${label} must be a PNG file.`;

  const maxBytes = 2 * 1024 * 1024; // 2MB
  if (file.size > maxBytes) return `${label} must be under 2MB.`;

  return "";
}


export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  const [form, setForm] = useState({
    name: "",
    firm_name: "",
    qualification: "",
    address: "",
    phone: "",
  });

  const [files, setFiles] = useState<{ letterhead: File | null; signseal: File | null }>({
    letterhead: null,
    signseal: null,
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const load = async () => {
    const res = await api("/api/profile");
    const p = res.profile || {};
    setIsComplete(!!res.is_complete);
    setProfile(p);

    setForm({
      name: p.name || "",
      firm_name: p.firm_name || "",
      qualification: p.qualification || "",
      address: p.address || "",
      phone: p.phone || "",
    });

    // If complete, auto-send to dashboard
    //if (res.is_complete) {
    //  navigate("/", { replace: true });
    //}
  };

  useEffect(() => {
    load().catch((e) => setErr(e.message || "Failed to load profile"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const saveAll = async () => {
  try {
    setLoading(true);
    setErr("");
    setOk("");

    // 1) Save profile fields
    await api("/api/profile", {
      method: "PUT",
      body: JSON.stringify(form),
    });

    if (files.letterhead) {
    const msg = validatePng(files.letterhead, "Letterhead");
    if (msg) return setErr(msg);
    }
    if (files.signseal) {
      const msg = validatePng(files.signseal, "Sign + Seal");
    if (msg) return setErr(msg);
    }

    // 2) Upload files (only if selected)
  const hasFiles = !!files.letterhead || !!files.signseal;
      if (hasFiles) {
        const fd = new FormData();
        if (files.letterhead) fd.append("letterhead", files.letterhead);
        if (files.signseal) fd.append("signseal", files.signseal);

        await api("/api/profile/upload", {
          method: "POST",
          body: fd,
          isForm: true,
        });

        setFiles({ letterhead: null, signseal: null });
      }

      // 3) Reload once (to update status + uploaded flags)
      await load();

      setOk(hasFiles ? "Profile + files saved successfully." : "Profile saved successfully.");
    } catch (e: any) {
      setErr(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };



  const save = async () => {
    try {
      setLoading(true);
      setErr("");
      setOk("");

      await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      });

      setOk("Profile saved.");
      await load(); // re-check completeness
    } catch (e: any) {
      setErr(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const upload = async () => {
    try {
      setLoading(true);
      setErr("");
      setOk("");

      if (!files.letterhead && !files.signseal) {
        setErr("Please select at least one PNG file to upload.");
        return;
      }

      const fd = new FormData();
      if (files.letterhead) fd.append("letterhead", files.letterhead);
      if (files.signseal) fd.append("signseal", files.signseal);

      const res = await api("/api/profile/upload", {
        method: "POST",
        body: fd,
        isForm: true,
      });

      setOk("Files uploaded successfully.");
      setFiles({ letterhead: null, signseal: null });

      // if backend returns is_complete, respect it
      await load();
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {err}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200">
          {ok}
        </div>
      ) : null}

      <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold text-black dark:text-white">Engineer Profile</h3>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Status:{" "}
            <span className={isComplete ? "font-semibold text-green-600" : "font-semibold text-orange-600"}>
              {isComplete ? "Complete" : "Incomplete"}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Engineer name" />
          </div>

          <div>
            <Label>Firm Name *</Label>
            <Input
              value={form.firm_name}
              onChange={(e) => setForm({ ...form, firm_name: e.target.value })}
              placeholder="Firm / Consultancy Name"
            />
          </div>

          <div>
            <Label>Qualification *</Label>
            <Input
              value={form.qualification}
              onChange={(e) => setForm({ ...form, qualification: e.target.value })}
              placeholder="e.g. B.E. Civil, M.E. Structure, B. Arch."
            />
          </div>

          <div>
            <Label>Contact Number *</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Mobile number" />
          </div>

          <div className="md:col-span-2">
            <Label>Address *</Label>
            <textarea
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white"
              rows={3}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Full Address"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button disabled={loading} onClick={saveAll} className="w-full sm:w-auto">
            {loading ? "Saving..." : files.letterhead || files.signseal ? "Save Profile + Upload" : "Save Profile"}
          </Button>
        </div>
      </div>

      <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h3 className="text-xl font-semibold text-black dark:text-white">Upload Letterhead & Sign+Seal</h3>
        <p className="mt-1 text-sm text-body dark:text-bodydark">
          Letterhead prints only on first page. Sign & seal prints on all pages.
        </p>

        <div className="mt-4 grid gap-4">
          <FilePicker
            label="Letterhead (PNG)"
            hint="PNG only (max 2MB). Recommended: 2480px wide (A4 @300DPI), height 250–450px. White/transparent background. Header band only (first page)."
            file={files.letterhead}
            onPick={(f: File | null) => setFiles((s) => ({ ...s, letterhead: f }))}
            onClear={() => setFiles((s) => ({ ...s, letterhead: null }))}
          />

          <FilePicker
            label="Sign + Seal (PNG)"
            hint="PNG only (max 2MB). Recommended: transparent background. Size: 600–1200px wide. Sign & seal only (prints on all pages)."
            file={files.signseal}
            onPick={(f: File | null) => setFiles((s) => ({ ...s, signseal: f }))}
            onClear={() => setFiles((s) => ({ ...s, signseal: null }))}
          />
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Letterhead: {profile?.letterhead_path ? "✅ Uploaded" : "❌ Missing"} <br />
            Sign+Seal: {profile?.signseal_path ? "✅ Uploaded" : "❌ Missing"}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button disabled={loading} onClick={upload} className="w-full sm:w-auto">
              {loading ? "Uploading..." : "Upload Files"}
            </Button>
          </div>
          

        </div>
      </div>
    </div>
  );
}
