import offlineStyles from "@/pages/DataAnalysis/OfflineManager/index.less";
import WorkflowTree from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree";

const OfflineManager = () => {
  return (
    <div className={offlineStyles.offlineMain} style={{ background: "#fff" }}>
      <div className={offlineStyles.right}>
        <WorkflowTree />
      </div>
    </div>
  );
};
export default OfflineManager;
