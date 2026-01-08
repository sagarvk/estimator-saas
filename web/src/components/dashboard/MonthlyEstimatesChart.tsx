import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

function monthLabel(yyyymm: string) {
  // "2026-01" -> "Jan 26"
  const [y, m] = yyyymm.split("-");
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleString("en-US", { month: "short" }) + " " + String(y).slice(2);
}

export default function MonthlyEstimatesChart() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [seriesData, setSeriesData] = useState<{ month: string; paid_count: number }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const res = await api("/api/dashboard/monthly?months=12");
        setSeriesData((res.series || []).map((x: any) => ({ month: x.month, paid_count: x.paid_count || 0 })));
      } catch (e: any) {
        setErr(e?.message || "Failed to load monthly chart");
        setSeriesData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => seriesData.map((s) => monthLabel(s.month)), [seriesData]);

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: { fontFamily: "Outfit, sans-serif", type: "bar", height: 220, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: "45%", borderRadius: 6, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 4, colors: ["transparent"] },
    xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { title: { text: undefined } },
    grid: { yaxis: { lines: { show: true } } },
    tooltip: { y: { formatter: (val: number) => `${val}` } },
  };

  const series = [
    {
      name: "Paid Estimates",
      data: seriesData.map((s) => s.paid_count),
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Monthly Paid Estimates</h3>
        <div className="text-xs text-gray-500 dark:text-gray-400">{loading ? "Loading..." : "Last 12 months"}</div>
      </div>

      {err ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {err}
        </div>
      ) : null}

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[650px] xl:min-w-full">
          <Chart options={options} series={series} type="bar" height={220} />
        </div>
      </div>
    </div>
  );
}
