import { useEffect, useMemo, useState } from "react";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { api } from "../../lib/api";
import { loadRazorpayScript } from "../../lib/razorpay";

function Select({ value, onChange, children, disabled = false }) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white disabled:opacity-60"
    >
      {children}
    </select>
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white"
    />
  );
}

function fmtINR(n) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(Number(n || 0));
  } catch {
    return `₹${n}`;
  }
}

// ✅ helper: convert to ALL CAPS safely
function toCaps(v) {
  return (v ?? "").toString().toUpperCase();
}

export default function Estimate() {
  const [loading, setLoading] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [err, setErr] = useState("");
  const [price, setPrice] = useState(399);
  const [paying, setPaying] = useState(false);

  // masters
  const [projectTypes, setProjectTypes] = useState([]);
  const [qualities, setQualities] = useState([]);

  // form fields
  const [clientName, setClientName] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [plotL, setPlotL] = useState("");
  const [plotW, setPlotW] = useState("");
  const [floors, setFloors] = useState("1");
  const [builtup, setBuiltup] = useState("");

  const [projectTypeCode, setProjectTypeCode] = useState("");
  const [qualityId, setQualityId] = useState("");

  // preview popup
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [quota, setQuota] = useState(null);

  const selectedQuality = useMemo(
    () => qualities.find((q) => String(q.id) === String(qualityId)),
    [qualities, qualityId]
  );

  //Free Quota
  const fetchQuota = async () => {
  try {
    const q = await api("/api/payments/quota");
      setQuota(q);
    } catch {
     setQuota(null);
    }
  };
  useEffect(() => {
    fetchQuota();
  }, []);



  // ✅ reset everything after successful download
  const resetForm = () => {
    setClientName("");
    setProjectAddress("");
    setPlotL("");
    setPlotW("");
    setFloors("1");
    setBuiltup("");

    // keep project type, reset quality list to first item
    if (projectTypes?.length) {
      const code = projectTypeCode || projectTypes[0].code;
      setProjectTypeCode(code);
    } else {
      setProjectTypeCode("");
    }

    setQualityId("");
    setPreview(null);
    setPreviewOpen(false);
    setErr("");
  };

  // 1) load project types on mount
  useEffect(() => {
    (async () => {
      try {
        setLoadingMasters(true);
        const { project_types } = await api("/api/masters/project-types");
        setProjectTypes(project_types || []);
        if (project_types?.length) setProjectTypeCode(project_types[0].code);
      } catch (e) {
        setErr(e.message || "Failed to load project types");
      } finally {
        setLoadingMasters(false);
      }
    })();
  }, []);

  // 2) load qualities when projectTypeCode changes
  useEffect(() => {
    if (!projectTypeCode) return;
    (async () => {
      try {
        setErr("");
        const { qualities } = await api(
          `/api/masters/qualities?project_type_code=${encodeURIComponent(projectTypeCode)}`
        );
        setQualities(qualities || []);
        setQualityId(qualities?.[0]?.id ? String(qualities[0].id) : "");
      } catch (e) {
        setErr(e.message || "Failed to load qualities");
        setQualities([]);
        setQualityId("");
      }
    })();
  }, [projectTypeCode]);

  // Fetch price
  useEffect(() => {
    (async () => {
      try {
        const { pricing } = await api("/api/settings/pricing");
        if (pricing?.price_per_estimate_inr) setPrice(pricing.price_per_estimate_inr);
      } catch {}
    })();
  }, []);

  const onGenerate = async () => {
    setErr("");

    if (!clientName.trim()) return setErr("Client name is required.");
    if (!projectAddress.trim()) return setErr("Project address is required.");
    if (!builtup || Number(builtup) <= 0) return setErr("Built-up area must be > 0.");
    if (!projectTypeCode) return setErr("Select project type.");
    if (!qualityId) return setErr("Select construction quality.");

    try {
      setLoading(true);

      const body = {
        client_name: toCaps(clientName.trim()),
        project_address: toCaps(projectAddress.trim()),
        plot_length_ft: plotL ? Number(plotL) : null,
        plot_width_ft: plotW ? Number(plotW) : null,
        floors: floors ? Number(floors) : null,
        builtup_area_sqft: Number(builtup),
        project_type_code: projectTypeCode,
        quality_id: Number(qualityId), // bigint
      };

      const data = await api("/api/estimates/preview", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setPreview(data);
      setPreviewOpen(true);
    } catch (e) {
      setErr(e.message || "Failed to generate estimate preview");
    } finally {
      setLoading(false);
    }
  };

  const onPayAndDownload = async () => {
    try {
      setErr("");
      setPaying(true);

      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Razorpay SDK failed to load. Check internet.");

      const estimate_payload = {
        client_name: toCaps(clientName.trim()),
        project_address: toCaps(projectAddress.trim()),
        plot_length_ft: plotL ? Number(plotL) : null,
        plot_width_ft: plotW ? Number(plotW) : null,
        floors: floors ? Number(floors) : null,
        builtup_area_sqft: Number(builtup),
        project_type_code: projectTypeCode,
        quality_id: Number(qualityId), // ✅ keep consistent
      };

      const created = await api("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ estimate_payload }),
      });
      // ✅ FREE demo case: backend already generated PDF
      if (created.free) {
        window.location.href = created.download_url;
        resetForm();
        setPaying(false);
      return;
      }


      const orderId = created.order.id;
      const rzKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!rzKey) throw new Error("Missing VITE_RAZORPAY_KEY_ID in frontend env");

      const options: any = {
        key: rzKey,
        name: "EstimatorPro",
        description: `Estimate for ${toCaps(clientName)}`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            const confirmed = await api("/api/payments/confirm", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const url = confirmed.download_url;

            // ✅ trigger download
            window.location.href = url;

            // ✅ clear form after payment+download is triggered
            resetForm();
          } catch (e: any) {
            setErr(e.message || "Payment confirmed but download failed");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      setErr(e.message || "Payment failed");
      setPaying(false);
    }
  };

  const onFreeDownload = async () => {
  try {
    setErr("");
    setPaying(true);

    const estimate_payload = {
      client_name: toCaps(clientName.trim()),
      project_address: toCaps(projectAddress.trim()),
      plot_length_ft: plotL ? Number(plotL) : null,
      plot_width_ft: plotW ? Number(plotW) : null,
      floors: floors ? Number(floors) : null,
      builtup_area_sqft: Number(builtup),
      project_type_code: projectTypeCode,
      quality_id: Number(qualityId),
    };

    const resp = await api("/api/payments/free-download", {
      method: "POST",
      body: JSON.stringify({ estimate_payload }),
    });

    window.location.href = resp.download_url;

    // refresh quota + reset
    await fetchQuota();
    resetForm();
  } catch (e) {
    setErr(e.message || "Free download failed");
  } finally {
    setPaying(false);
  }
};


  return (
    <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-black dark:text-white">Estimate</h3>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {loadingMasters ? "Loading..." : selectedQuality ? `Rate: ₹${selectedQuality.rate_per_sqft}/sq.ft` : ""}
        </div>
      </div>

      {err ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {err}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label>Client Name *</Label>
          <Input
            value={clientName}
            onChange={(e) => setClientName(toCaps(e.target.value))}
            placeholder="CLIENT FULL NAME"
          />
        </div>

        <div>
          <Label>Project Address *</Label>
          <TextArea
            value={projectAddress}
            onChange={(e) => setProjectAddress(toCaps(e.target.value))}
            placeholder="ENTER FULL SITE ADDRESS"
            rows={3}
          />
        </div>

        <div>
          <Label>Plot Length (ft.)</Label>
          <Input value={plotL} onChange={(e) => setPlotL(e.target.value)} placeholder="e.g. 40" />
        </div>

        <div>
          <Label>Plot Width (ft.)</Label>
          <Input value={plotW} onChange={(e) => setPlotW(e.target.value)} placeholder="e.g. 30" />
        </div>

        <div>
          <Label>No. of Floors</Label>
          <Input value={floors} onChange={(e) => setFloors(e.target.value)} placeholder="e.g. 2" />
        </div>

        <div>
          <Label>Total Built-up Area (sq.ft.) *</Label>
          <Input value={builtup} onChange={(e) => setBuiltup(e.target.value)} placeholder="e.g. 1200" />
        </div>

        <div>
          <Label>Project Type *</Label>
          <Select value={projectTypeCode} onChange={(e) => setProjectTypeCode(e.target.value)} disabled={loadingMasters}>
            <option value="" disabled>
              Select project type
            </option>
            {projectTypes.map((pt) => (
              <option key={pt.code} value={pt.code}>
                {pt.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Construction Quality *</Label>
          <Select value={qualityId} onChange={(e) => setQualityId(e.target.value)} disabled={!projectTypeCode}>
            <option value="" disabled>
              Select quality
            </option>
            {qualities.map((q) => (
              <option key={q.id} value={String(q.id)}>
                {q.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button onClick={onGenerate} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Generating..." : "Generate Estimate"}
        </Button>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          * GST (18%) will be added in final totals. Popup will show break-up.
        </div>
      </div>

      {/* Preview Modal */}
      {previewOpen && preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg dark:bg-boxdark">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold text-black dark:text-white">Estimate Preview</div>
                <div className="mt-1 text-xl font-semibold text-black dark:text-white">{toCaps(clientName)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Project Estimate Summary</div>
              </div>

              <button
                onClick={() => setPreviewOpen(false)}
                className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 rounded border border-stroke p-3 dark:border-strokedark">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Subtotal (Excl. GST)</span>
                <span className="font-semibold text-black dark:text-white">
                  {fmtINR(preview.final?.sub_total_excl_gst)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">GST @18%</span>
                <span className="font-semibold text-black dark:text-white">{fmtINR(preview.final?.gst_amount)}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="font-semibold text-black dark:text-white">Total (Incl. GST)</span>
                <span className="font-semibold text-black dark:text-white">
                  {fmtINR(preview.final?.grand_total_incl_gst)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setPreviewOpen(false)} className="w-full sm:w-auto">
              Edit
            </Button>

            {quota?.free_left > 0 ? (
              <Button
                onClick={onFreeDownload}
                disabled={paying}
                className="w-full sm:w-auto"
              >
                {paying ? "Preparing..." : `Download Free (${quota.free_left} left)`}
              </Button>
            ) : (
              <Button onClick={onPayAndDownload} disabled={paying} className="w-full sm:w-auto">
                {paying ? "Opening Payment..." : `Pay ₹${price} & Download`}
              </Button>
            )}
          </div>

            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              After download, the form will reset automatically.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
