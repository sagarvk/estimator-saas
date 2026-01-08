import React from "react";
import { loadRazorpayScript } from "../../lib/razorpay";


function formatINR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value ?? "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const onPayAndDownload = async () => {
  try {
    setErr("");
    setPaying(true);

    const ok = await loadRazorpayScript();
    if (!ok) throw new Error("Razorpay SDK failed to load. Check internet.");

    // Use the exact payload that was used for preview
    const estimate_payload = {
      client_name: clientName.trim(),
      project_address: projectAddress.trim(),
      plot_length_ft: plotL ? Number(plotL) : null,
      plot_width_ft: plotW ? Number(plotW) : null,
      floors: floors ? Number(floors) : null,
      builtup_area_sqft: Number(builtup),
      project_type_code: projectTypeCode,
      quality_id: Number(qualityId),
    };

    // 1) create order (backend sets amount from settings)
    const created = await api("/api/payments/create-order", {
      method: "POST",
      body: JSON.stringify({ estimate_payload }),
    });

    const orderId = created.order.id;
    const rzKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

    if (!rzKey) throw new Error("Missing VITE_RAZORPAY_KEY_ID in frontend env");

    const options: any = {
      key: rzKey,
      name: "EstimatorPro",
      description: `Estimate for ${clientName}`,
      order_id: orderId,
      // Razorpay amount/currency comes from order
      handler: async function (response: any) {
        try {
          // 2) confirm payment + generate pdf
          const confirmed = await api("/api/payments/confirm", {
            method: "POST",
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          // 3) download
          const url = confirmed.download_url;
          window.location.href = url;

          // close modal
          setPreviewOpen(false);
        } catch (e: any) {
          setErr(e.message || "Payment confirmed but download failed");
        } finally {
          setPaying(false);
        }
      },
      modal: {
        ondismiss: () => setPaying(false),
      },
      theme: { color: "#3C50E0" }, // TailAdmin brand-ish (optional)
    };

    // eslint-disable-next-line
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  } catch (e: any) {
    setErr(e.message || "Payment failed");
    setPaying(false);
  }
};




export default function EstimatePreviewModal({
  open,
  clientName,
  amount,
  refNo,
  onClose,
  onPay,
  loading,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={loading ? undefined : onClose}
      />

      <div className="relative w-full max-w-lg rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-black dark:text-white">
              Estimate Ready
            </h3>
            <p className="mt-1 text-sm text-body dark:text-bodydark">
              Confirm payment to download PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={loading ? undefined : onClose}
            className="text-body hover:text-black dark:text-bodydark dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <div className="rounded border border-stroke bg-gray-2 p-4 dark:border-strokedark dark:bg-meta-4">
            <div className="text-sm text-body dark:text-bodydark">Client Name</div>
            <div className="mt-1 font-semibold text-black dark:text-white">
              {clientName || "-"}
            </div>
          </div>

          <div className="rounded border border-stroke bg-gray-2 p-4 dark:border-strokedark dark:bg-meta-4">
            <div className="text-sm text-body dark:text-bodydark">
              Estimate Amount (Incl. GST)
            </div>
            <div className="mt-1 text-2xl font-bold text-black dark:text-white">
              ₹ {formatINR(amount)}
            </div>

            {refNo ? (
              <div className="mt-1 text-xs text-body dark:text-bodydark">
                Ref. No: <span className="font-semibold">{refNo}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={!!loading}
            className="w-full rounded border border-stroke px-5 py-2 font-semibold text-black hover:bg-gray-2 dark:border-strokedark dark:text-white dark:hover:bg-meta-4 sm:w-auto disabled:opacity-60"
          >
            Cancel
          </button>

          <Button
            onClick={onPayAndDownload}
            disabled={paying}
            className="w-full sm:w-auto"
          >
            {paying ? "Opening Payment..." : `Pay ₹${price} & Download`}
          </Button>

        </div>
      </div>
    </div>
  );
}
