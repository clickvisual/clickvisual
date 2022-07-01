import style from "./index.less";
import { Empty } from "antd";
import { useMemo } from "react";
import { useIntl, useModel } from "umi";
import { BigDataNavEnum } from "@/pages/DataAnalysis/service/enums";
import DataAnalysisNav from "@/pages/DataAnalysis/components/Nav";
import ScreeningRow from "@/pages/DataAnalysis/components/ScreeningRow";
import RightMenu from "@/pages/DataAnalysis/components/RightMenu";
import TemporaryQuery from "@/pages/DataAnalysis/TemporaryQuery";
import RealTimeTrafficFlow from "@/pages/DataAnalysis/RealTimeBusinessFlow";
import DataSourceManage from "@/pages/DataAnalysis/DataSourceManage";
import OfflineManager from "@/pages/DataAnalysis/OfflineManager";

import ManageNodeModal from "@/pages/DataAnalysis/components/NodeManage/ManageNodeModal";
import ManageFolderModal from "@/pages/DataAnalysis/components/NodeManage/ManageFolderModal";

const DataAnalysis = () => {
  const { navKey, currentInstances, openNodeId } = useModel("dataAnalysis");
  const i18n = useIntl();

  const NavContent = useMemo(() => {
    if (!currentInstances) {
      return (
        <div className={style.defaultPage}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={i18n.formatMessage({ id: "datasource.draw.selected" })}
          />
        </div>
      );
    }
    switch (navKey) {
      case BigDataNavEnum.TemporaryQuery:
        return <TemporaryQuery />;
      case BigDataNavEnum.RealTimeTrafficFlow:
        return <RealTimeTrafficFlow />;
      case BigDataNavEnum.OfflineManage:
        return <OfflineManager />;
      case BigDataNavEnum.DataSourceManage:
        return <DataSourceManage />;
      default:
        return <></>;
    }
  }, [navKey, currentInstances]);

  const rightMenu = useMemo(() => {
    if (
      currentInstances &&
      openNodeId &&
      (navKey == BigDataNavEnum.TemporaryQuery ||
        navKey == BigDataNavEnum.OfflineManage)
    ) {
      return <RightMenu />;
    }
    return <></>;
  }, [navKey, currentInstances, openNodeId]);

  return (
    <div className={style.main}>
      <div className={style.contentBox}>
        <DataAnalysisNav />
        <div className={style.content}>{NavContent}</div>
        {rightMenu}
      </div>
      <div className={style.positionBox}>
        <ScreeningRow />
      </div>
      <ManageNodeModal />
      <ManageFolderModal />
    </div>
  );
};

export default DataAnalysis;
export { BigDataNavEnum } from "@/pages/DataAnalysis/service/enums";
