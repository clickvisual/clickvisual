import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import FolderTree from "@/pages/DataAnalysis/TemporaryQuery/components/FolderTree";
import { Empty, Spin, Tabs } from "antd";
import { useEffect, useMemo } from "react";
import SQLTabPaneItem from "./components/SQLTabPaneItem";
import { useIntl, useModel } from "umi";
import { cloneDeep } from "lodash";
import { PaneItemType } from "@/models/dataanalysis/useFilePane";
import Luckysheet from "@/components/Luckysheet";
import useUrlState from "@ahooksjs/use-url-state";
import useLocalStorages, { LocalModuleType } from "@/hooks/useLocalStorages";

const { TabPane } = Tabs;

const TemporaryQuery = () => {
  const i18n = useIntl();
  const [urlState] = useUrlState();
  const { onSetLocalData } = useLocalStorages();
  const {
    paneList,
    onChangePaneList,
    currentPaneActiveKey,
    onChangeCurrentPaneActiveKey,
  } = useModel("dataanalysis.useFilePane");
  const { temporaryQuery, changeOpenNodeId, doGetNodeInfo, luckysheetData } =
    useModel("dataAnalysis");

  const { setSelectNodeKeys, temporaryQueryNodes } = temporaryQuery;

  const panes = useMemo(() => {
    return cloneDeep(paneList);
  }, [paneList]);

  const onChange = (key: string) => {
    onChangeCurrentPaneActiveKey(key);
    const title = paneList.filter((item: any) => item.key == key)[0].title;
    setSelectNodeKeys([`0-${key}-${title}`]);
    changeOpenNodeId(parseInt(key));
  };

  const remove = (targetKey: string) => {
    const targetIndex = panes.findIndex((pane) => pane.key == targetKey);
    const newPanes = panes.filter((pane) => pane.key != targetKey);

    if (targetKey === currentPaneActiveKey) {
      const index =
        targetIndex === newPanes.length ? targetIndex - 1 : targetIndex;
      if (newPanes.length) {
        const { key } = newPanes[index];
        onChangeCurrentPaneActiveKey(key.toString());
        setSelectNodeKeys([`0-${key}-${newPanes[index].title}`]);
        changeOpenNodeId(parseInt(key));
      } else {
        setSelectNodeKeys([]);
        changeOpenNodeId(undefined);
      }
    }
    onChangePaneList(newPanes);
  };

  const onEdit = (targetKey: any, action: "add" | "remove") => {
    if (action === "add") {
      // add();
    } else {
      remove(targetKey);
    }
  };

  useEffect(() => {
    if (temporaryQueryNodes?.length > 0) {
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
        const selectNodeData = temporaryQueryNodes?.filter((item: any) => {
          return item.id == parseInt(openId);
        });
        const nodeData = selectNodeData[0];
        if (nodeData) {
          const clonePaneList = cloneDeep(paneList);
          if (
            clonePaneList.filter((item: any) => item.key == nodeData.id)
              .length == 0
          ) {
            onChangePaneList([
              ...clonePaneList,
              {
                key: openId.toString(),
                title: nodeData?.name || "not name",
                parentId: nodeData.folderId,
                node: nodeData,
              },
            ]);
            onChangeCurrentPaneActiveKey(`${openId}`);
          }
        }
      }
    }
  }, [temporaryQueryNodes]);

  useEffect(() => {
    if (currentPaneActiveKey) {
      changeOpenNodeId(parseInt(currentPaneActiveKey));
      const item = temporaryQueryNodes.filter(
        (item: any) => item.id == currentPaneActiveKey
      );
      item.length > 0 &&
        setSelectNodeKeys([`0-${currentPaneActiveKey}-${item[0].name}`]);
    }
  }, []);

  return (
    <div className={TemporaryQueryStyle.queryMain}>
      <FolderTree />
      <div className={TemporaryQueryStyle.content}>
        {panes?.length > 0 ? (
          <div style={{ width: "100%" }}>
            <Tabs
              hideAdd
              onChange={onChange}
              activeKey={currentPaneActiveKey}
              type="editable-card"
              onEdit={onEdit}
              className={TemporaryQueryStyle.fileNameList}
            >
              {panes.map((pane: PaneItemType) => {
                return (
                  <TabPane
                    tab={pane.title}
                    key={pane.key}
                    forceRender
                    style={{ background: "#fff", width: "100%" }}
                  >
                    <SQLTabPaneItem
                      id={parseInt(pane.key)}
                      parentId={pane.parentId}
                      node={pane.node}
                      currentPaneActiveKey={currentPaneActiveKey}
                    />
                  </TabPane>
                );
              })}
            </Tabs>
            <Spin spinning={doGetNodeInfo.loading}>
              <div
                style={{
                  position: "relative",
                  width: "calc(100% - 32px)",
                  height: "calc(40vh - 32px - 32px)",
                  top: "calc(-40vh + 32px + 32px)",
                  zIndex: 10,
                }}
              >
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
          </div>
        ) : (
          <div className={TemporaryQueryStyle.empty}>
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
export default TemporaryQuery;
