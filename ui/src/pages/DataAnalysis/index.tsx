import style from "./index.less";
import { Empty } from "antd";
import { useEffect, useMemo } from "react";
import { useIntl, useModel } from "umi";
import { BigDataNavEnum } from "@/pages/DataAnalysis/service/enums";
import DataAnalysisNav from "@/pages/DataAnalysis/components/Nav";
import ScreeningRow from "@/pages/DataAnalysis/components/ScreeningRow";
import TemporaryQuery from "@/pages/DataAnalysis/TemporaryQuery";
import StatisticalBoard from "@/pages/DataAnalysis/StatisticalBoard";
import RealTimeTrafficFlow from "@/pages/DataAnalysis/RealTimeBusinessFlow";
import DataSourceManage from "@/pages/DataAnalysis/DataSourceManage";
import OfflineManager from "@/pages/DataAnalysis/OfflineManager";
import ManageNodeModal from "@/pages/DataAnalysis/components/NodeManage/ManageNodeModal";
import ManageFolderModal from "@/pages/DataAnalysis/components/NodeManage/ManageFolderModal";
import useUrlState from "@ahooksjs/use-url-state";
import useLocalStorages, { LocalModuleType } from "@/hooks/useLocalStorages";
// import { cloneDeep } from "lodash";

const DataAnalysis = () => {
  const {
    navKey,
    currentInstances,
    openNodeId,
    changeOpenNodeId,
    manageNode,
    temporaryQuery,
    // doGetNodeInfo,
    // changeOpenNodeData,
    // changeFolderContent,
    getUserList,
  } = useModel("dataAnalysis");
  // const { paneList, onChangePaneList, onChangeCurrentPaneActiveKey } = useModel(
  //   "dataanalysis.useFilePane"
  // );
  const i18n = useIntl();
  const [urlState] = useUrlState<any>();
  const { onSetLocalData } = useLocalStorages();
  const { nodes, setSelectKeys } = manageNode;
  const { temporaryQueryNodes, setSelectNodeKeys } = temporaryQuery;

  // 获取文件信息
  // const onGetFolderInfo = (id: number) => {
  //   id &&
  //     doGetNodeInfo.run(id).then((res: any) => {
  //       if (res?.code === 0) {
  //         changeOpenNodeData(res.data);
  //         // changeFolderContent(res.data.content);
  //       }
  //     });
  // };

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
      case BigDataNavEnum.StatisticalBoard:
        return <StatisticalBoard />;
      default:
        return <></>;
    }
  }, [navKey, currentInstances]);

  // 副作用

  useEffect(() => {
    getUserList();
  }, []);

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

  useEffect(() => {
    if (nodes?.length > 0 || temporaryQueryNodes?.length > 0) {
      let openId: any;

      if (urlState && urlState.nodeId) {
        openId = urlState.nodeId;
      }

      const localOpneId = onSetLocalData(
        undefined,
        LocalModuleType.dataAnalysisOpenNodeId
      );

      if (!urlState?.nodeId && localOpneId) {
        openId = localOpneId;
      }

      let currentNodes = nodes.length > 0 ? nodes : temporaryQueryNodes;

      if (openId) {
        const selectNodeData = currentNodes?.filter((item: any) => {
          return item.id == parseInt(openId);
        });
        const nodeData = selectNodeData[0];
        if (nodeData) {
          const key = `${nodeData.workflowId}-${nodeData.id}-${nodeData.name}`;
          if (nodes.length > 0) {
            setSelectKeys([key]);
            return;
          }
          setSelectNodeKeys([key]);
        }
      }
    }
  }, [nodes, temporaryQueryNodes]);

  return (
    <div className={style.main}>
      <div className={style.contentBox}>
        <DataAnalysisNav />
        <div className={style.content}>{NavContent}</div>
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
