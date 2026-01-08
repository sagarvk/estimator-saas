import { useEffect, useState } from "react";
import Button from "../ui/button/Button";
import { api } from "../../lib/api";

function fmtINR(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDMY(dateStr?: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function RecentEstimates() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setErr("");
      setLoading(true);
      const res = await api("/api/dashboard/summary");
      setRows(res.recent_estimates || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load recent estimates");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const download = async (id: string) => {
    try {
      setErr("");
      setDownloadingId(id);
      const res = await api(`/api/estimates/download/${id}`);
      if (!res.download_url) throw new Error("Download URL not received");
      window.open(res.download_url, "_blank");
    } catch (e: any) {
      setErr(e?.message || "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Recent Estimates</h3>
        <Button size="sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {err ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {err}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-50 text-left dark:bg-meta-4">
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">REF</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">DATE</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">CLIENT</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">TOTAL</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No recent estimates.
                </td>
              </tr>
            ) : (
              rows.map((r: any) => (
                <tr key={r.id} className="border-t border-stroke dark:border-strokedark">
                  <td className="px-4 py-3 text-sm font-medium text-black dark:text-white">{r.ref_no || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {fmtDMY(r.estimate_date || r.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{r.client_name || "-"}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-black dark:text-white">
                    {fmtINR(r.grand_total_incl_gst)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      onClick={() => download(r.id)}
                      disabled={!r.pdf_path || downloadingId === r.id}
                    >
                      {downloadingId === r.id ? "Downloading..." : "Download"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
