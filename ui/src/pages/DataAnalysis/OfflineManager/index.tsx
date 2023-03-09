import Luckysheet from "@/components/Luckysheet";
import useLocalStorages, { LocalModuleType } from "@/hooks/useLocalStorages";
import { PaneItemType } from "@/models/dataanalysis/useFilePane";
import WorkflowTree from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree";
import offlineStyles from "@/pages/DataAnalysis/OfflineManager/index.less";
import useUrlState from "@ahooksjs/use-url-state";
import { Empty, Spin, Tabs } from "antd";
import { cloneDeep } from "lodash";
import { useEffect, useMemo } from "react";
import { useIntl, useModel } from "umi";
import { PrimaryEnums, SecondaryEnums } from "../service/enums";
import TabPaneItem from "./components/TabPaneItem";

const OfflineManager = () => {
  const i18n = useIntl();
  const [urlState] = useUrlState();
  const { onSetLocalData } = useLocalStorages();
  const {
    offlinePaneList,
    onChangeOfflinePaneList,
    currentOfflinePaneActiveKey,
    onChangeCurrentOfflinePaneActiveKey,
    doGetNodeInfo,
    luckysheetData,
    changeOpenNodeId,
    setSelectKeys,
    nodes,
    workflowList,
    getFolders,
  } = useModel("dataAnalysis", (model) => ({
    offlinePaneList: model.filePane.offlinePaneList,
    onChangeOfflinePaneList: model.filePane.onChangeOfflinePaneList,
    currentOfflinePaneActiveKey: model.filePane.currentOfflinePaneActiveKey,
    onChangeCurrentOfflinePaneActiveKey:
      model.filePane.onChangeCurrentOfflinePaneActiveKey,
    doGetNodeInfo: model.doGetNodeInfo,
    luckysheetData: model.luckysheetData,
    changeOpenNodeId: model.changeOpenNodeId,
    setSelectKeys: model.manageNode.setSelectKeys,
    nodes: model.manageNode.nodes,
    workflowList: model.workflow.workflowList,
    getFolders: model.manageNode.getFolders,
  }));

  const panes = useMemo(() => {
    return cloneDeep(offlinePaneList);
  }, [offlinePaneList]);

  const onChange = (key: string) => {
    onChangeCurrentOfflinePaneActiveKey(key);
    const node = offlinePaneList.filter((item: any) => item.key == key)[0].node;
    setSelectKeys([`${node.workflowId}-${node.id}-${node.name}`]);
    changeOpenNodeId(parseInt(key));
  };

  const remove = (targetKey: string) => {
    const targetIndex = panes.findIndex((pane) => pane.key === targetKey);
    const newPanes = panes.filter((pane) => pane.key !== targetKey);
    const index =
      targetIndex === newPanes.length ? targetIndex - 1 : targetIndex;

    if (newPanes.length) {
      const { key } = newPanes[index];
      onChangeCurrentOfflinePaneActiveKey(key.toString());
      setSelectKeys([
        `${newPanes[index].node.workflowId}-${key}-${newPanes[index].title}`,
      ]);
      changeOpenNodeId(parseInt(key));
    } else {
      setSelectKeys([]);
      changeOpenNodeId(undefined);
      onSetLocalData(null, LocalModuleType.dataAnalysisOpenNodeId);
      onChangeCurrentOfflinePaneActiveKey("");
    }
    onChangeOfflinePaneList(newPanes);
  };

  const onEdit = (targetKey: any, action: "add" | "remove") => {
    if (action === "add") {
      // add();
    } else {
      remove(targetKey);
    }
  };

  const getCurrentPane = () => {
    if (currentOfflinePaneActiveKey.length > 0) {
      return panes.filter((item: any) => {
        return item.key == currentOfflinePaneActiveKey;
      });
    }
    return [];
  };

  useEffect(() => {
    if (nodes?.length > 0) {
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

      if (openId) {
        const nodesItem = nodes?.filter((item: any) => {
          return item.id == parseInt(openId);
        });
        const workflowListItem = workflowList?.filter((workflowItem: any) => {
          return workflowItem.id == parseInt(openId);
        });
        const selectNodeData =
          nodesItem.length > 0 ? nodesItem : workflowListItem;

        const nodeData: any = selectNodeData[0];
        if (nodeData) {
          const clonePaneList = cloneDeep(offlinePaneList);
          if (
            clonePaneList.filter((item: any) => item.key == nodeData.id)
              .length == 0
          ) {
            if (nodesItem.length == 0 && workflowListItem[0]) {
              getFolders
                .run({
                  iid: workflowListItem[0].iid,
                  primary: PrimaryEnums.mining,
                  workflowId: workflowListItem[0].id,
                  secondary: SecondaryEnums.board,
                })
                .then((res: any) => {
                  onChangeOfflinePaneList([
                    ...clonePaneList,
                    {
                      key: openId.toString(),
                      title: nodeData?.name || "not name",
                      parentId: nodeData.folderId || 0,
                      node: res.data.nodes[0],
                    },
                  ]);
                });
            } else {
              onChangeOfflinePaneList([
                ...clonePaneList,
                {
                  key: openId.toString(),
                  title: nodeData?.name || "not name",
                  parentId: nodeData.folderId || 0,
                  node: nodeData,
                },
              ]);
            }
            onChangeCurrentOfflinePaneActiveKey(`${openId}`);
          }
        }
      }
    }
  }, [nodes, workflowList]);

  const items = useMemo(() => {
    let arr: any[] = [];

    panes.map((pane: PaneItemType) => {
      arr.push({
        key: pane.key,
        label: pane.title,
        forceRender: true,
        style: { background: "#fff", width: "100%", height: "100%" },
        children: (
          <TabPaneItem
            id={parseInt(pane.key)}
            node={pane.node}
            parentId={pane.parentId}
            currentOfflinePaneActiveKey={currentOfflinePaneActiveKey}
          />
        ),
      });
    });

    return arr;
  }, [panes, currentOfflinePaneActiveKey]);

  return (
    <div className={offlineStyles.offlineMain} style={{ background: "#fff" }}>
      <div className={offlineStyles.right}>
        <WorkflowTree />
      </div>
      <div className={offlineStyles.content}>
        {panes.length > 0 ? (
          <>
            <Tabs
              hideAdd
              items={items}
              onChange={onChange}
              activeKey={currentOfflinePaneActiveKey}
              type="editable-card"
              onEdit={onEdit}
              className={offlineStyles.fileNameList}
            />
            {getCurrentPane().length > 0 &&
            getCurrentPane()[0]?.node?.secondary ==
              SecondaryEnums.dataMining ? (
              <Spin spinning={doGetNodeInfo.loading}>
                <div className={offlineStyles.luckysheet}>
                  {luckysheetData[0].celldata.length > 0 ? (
                    <Luckysheet />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={i18n.formatMessage({
                        id: "bigdata.components.RightMenu.notResults",
                      })}
                    />
                  )}
                </div>
              </Spin>
            ) : null}
          </>
        ) : (
          <div className={offlineStyles.empty}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={i18n.formatMessage({
                id: "bigdata.components.SQLEditor.selectFile",
              })}
            />
          </div>
        )}
      </div>
    </div>
  );
};
export default OfflineManager;
