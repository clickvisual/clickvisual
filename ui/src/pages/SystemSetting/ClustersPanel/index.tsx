import ClustersSearchBar from "@/pages/SystemSetting/ClustersPanel/components/ClustersSearchBar";
import ClustersTable from "@/pages/SystemSetting/ClustersPanel/components/ClustersTable";
import CreatedOrUpdatedClusterModal from "@/pages/SystemSetting/ClustersPanel/components/CreatedOrUpdatedClusterModal";
import clusterPanelStyles from "@/pages/SystemSetting/ClustersPanel/index.less";
import type { ClusterType } from "@/services/systemSetting";
import { useModel } from "@umijs/max";
import { createContext, useEffect, useState } from "react";
type ClustersPanelContextType = {
  onChangeVisible?: (flag: boolean) => void;
  onChangeIsEditor?: (flag: boolean) => void;
  onChangeCurrentCluster?: (param: ClusterType | undefined) => void;
};
export const ClustersPanelContext = createContext<ClustersPanelContextType>({});
const ClustersPanel = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [isEditor, setIsEditor] = useState<boolean>(false);
  const [current, setCurrent] = useState<ClusterType | undefined>(undefined);
  const { doGetClustersList } = useModel("clusters");

  useEffect(() => {
    doGetClustersList();
  }, []);
  return (
    <div className={clusterPanelStyles.clusterPanelMain}>
      <ClustersPanelContext.Provider
        value={{
          onChangeVisible: (flag: boolean) => setOpen(flag),
          onChangeIsEditor: (flag: boolean) => setIsEditor(flag),
          onChangeCurrentCluster: (cluster: ClusterType | undefined) =>
            setCurrent(cluster),
        }}
      >
        <ClustersSearchBar />
        <ClustersTable />
      </ClustersPanelContext.Provider>
      <CreatedOrUpdatedClusterModal
        open={open}
        isEditor={isEditor}
        current={current}
        onCancel={() => {
          setVisible(false);
          setIsEditor(false);
          setCurrent(undefined);
        }}
      />
    </div>
  );
};
export default ClustersPanel;
