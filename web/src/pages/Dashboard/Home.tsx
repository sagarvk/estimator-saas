import PageMeta from "../../components/common/PageMeta";
import EstimatorMetrics from "../../components/dashboard/EstimatorMetrics";
import MonthlyEstimatesChart from "../../components/dashboard/MonthlyEstimatesChart";
import RecentEstimates from "../../components/dashboard/RecentEstimates";

export default function Home() {
  return (
    <>
      <PageMeta title="Dashboard | EstimatorPro" description="Estimator dashboard" />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6">
          <EstimatorMetrics />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <MonthlyEstimatesChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <RecentEstimates />
        </div>
      </div>
    </>
  );
}
