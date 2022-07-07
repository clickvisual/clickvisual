import style from "./index.less";
import { Empty } from "antd";
import { useEffect, useMemo } from "react";
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
import useUrlState from "@ahooksjs/use-url-state";
import useLocalStorages, { LocalModuleType } from "@/hooks/useLocalStorages";

const DataAnalysis = () => {
  const { navKey, currentInstances, openNodeId, changeOpenNodeId } =
    useModel("dataAnalysis");
  const i18n = useIntl();
  const [urlState, setUrlState] = useUrlState<any>();
  const { onSetLocalData } = useLocalStorages();

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

  useEffect(() => {
    setUrlState({ nodeId: openNodeId });
    onSetLocalData({ openNodeId }, LocalModuleType.dataAnalysisOpenNodeId);
  }, [openNodeId]);

  useEffect(() => {
    if (urlState && urlState.nodeId && urlState.nodeId != openNodeId) {
      changeOpenNodeId(parseInt(urlState.nodeId));
      return;
    }
    const openId = onSetLocalData(
      undefined,
      LocalModuleType.dataAnalysisOpenNodeId
    );
    if (openId) {
      changeOpenNodeId(openId?.openNodeId);
    }
  }, []);

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
