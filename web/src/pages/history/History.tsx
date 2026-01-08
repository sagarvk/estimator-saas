import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/button/Button";
import { api } from "../../lib/api";

type EstimateRow = {
  id: string;
  ref_no?: string | null;
  estimate_date?: string | null;
  client_name?: string | null;
  project_address?: string | null;
  grand_total_incl_gst?: number | string | null;
  status?: string | null;
  pdf_path?: string | null;
  created_at?: string | null;
};

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

function Badge({ text }: { text: string }) {
  const t = (text || "").toLowerCase();
  const cls =
    t === "paid"
      ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-200"
      : t.includes("pending")
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200"
      : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200";

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {(text || "unknown").toUpperCase()}
    </span>
  );
}

export default function History() {
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState<EstimateRow[]>([]);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      return (
        String(r.ref_no || "").toLowerCase().includes(s) ||
        String(r.client_name || "").toLowerCase().includes(s) ||
        String(r.project_address || "").toLowerCase().includes(s) ||
        String(r.status || "").toLowerCase().includes(s)
      );
    });
  }, [rows, q]);

  const load = async () => {
    try {
      setErr("");
      setLoading(true);

      const res = await api("/api/estimates/history");
      // backend: { estimates: [...] }
      setRows(Array.isArray(res.estimates) ? res.estimates : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load history");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = async (id: string) => {
    try {
      setErr("");
      setDownloadingId(id);

      const res = await api(`/api/estimates/download/${id}`);
      const url = res.download_url;

      if (!url) throw new Error("Download URL not received from server");
      window.open(url, "_blank");
    } catch (e: any) {
      setErr(e?.message || "Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-black dark:text-white">History</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Download your generated estimate PDFs.
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by ref, client, address, status..."
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white sm:w-80"
          />
          <Button onClick={load} disabled={loading} className="whitespace-nowrap">
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {err ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {err}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-50 text-left dark:bg-meta-4">
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">REF NO</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">DATE</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">CLIENT</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">ADDRESS</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">TOTAL</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">STATUS</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading history...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No estimates found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-stroke dark:border-strokedark">
                  <td className="px-4 py-3 text-sm font-medium text-black dark:text-white">
                    {r.ref_no || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {fmtDMY(r.estimate_date || r.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                    {(r.client_name || "-").toString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="max-w-[420px] whitespace-normal break-words">
                      {(r.project_address || "-").toString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-black dark:text-white">
                    {fmtINR(r.grand_total_incl_gst)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge text={r.status || "unknown"} />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      onClick={() => download(r.id)}
                      disabled={downloadingId === r.id || !r.pdf_path}
                    >
                      {downloadingId === r.id ? "Downloading..." : "Download PDF"}
                    </Button>
                    {!r.pdf_path ? (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        PDF not available
                      </div>
                    ) : null}
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
