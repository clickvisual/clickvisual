import clusterPanelStyles from "@/pages/SystemSetting/ClustersPanel/index.less";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useContext } from "react";
import { ClustersPanelContext } from "@/pages/SystemSetting/ClustersPanel";
import { useIntl } from "umi";

const ClustersSearchBar = () => {
  const { onChangeVisible } = useContext(ClustersPanelContext);
  const i18n = useIntl();
  return (
    <div className={clusterPanelStyles.searchBar}>
      <Button
        onClick={() => {
          if (onChangeVisible) onChangeVisible(true);
        }}
        icon={<PlusOutlined />}
        type={"primary"}
      >
        {i18n.formatMessage({ id: "cluster.button.add" })}
      </Button>
      {/*</div>*/}
    </div>
  );
};

export default ClustersSearchBar;
