import offlineStyles from "@/pages/DataAnalysis/OfflineManager/index.less";
import WorkflowTree from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree";
import WorkflowContent from "@/pages/DataAnalysis/OfflineManager/components/WorkflowContent";

const OfflineManager = () => {
  return (
    <div className={offlineStyles.offlineMain} style={{ background: "#fff" }}>
      <div className={offlineStyles.right}>
        <WorkflowTree />
      </div>
      <div className={offlineStyles.content}>
        <WorkflowContent />
      </div>
    </div>
  );
};
export default OfflineManager;
