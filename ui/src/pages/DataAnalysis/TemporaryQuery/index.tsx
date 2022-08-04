import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import FolderTree from "@/pages/DataAnalysis/TemporaryQuery/components/FolderTree";
import { Empty, Spin, Tabs } from "antd";
import { useEffect, useMemo } from "react";
import SQLTabPaneItem from "./components/SQLTabPaneItem";
import { useIntl, useModel } from "umi";
import { cloneDeep } from "lodash";
import { PaneItemType } from "@/models/dataanalysis/useFilePane";
import Luckysheet from "@/components/Luckysheet";

const { TabPane } = Tabs;

const TemporaryQuery = () => {
  const i18n = useIntl();
  const {
    paneList,
    onChangePaneList,
    currentPaneActiveKey,
    onChangeCurrentPaneActiveKey,
  } = useModel("dataanalysis.useFilePane");
  const {
    manageNode,
    temporaryQuery,
    changeOpenNodeId,
    doGetNodeInfo,
    luckysheetData,
  } = useModel("dataAnalysis");
  const { selectNode } = manageNode;

  const { setSelectNodeKeys } = temporaryQuery;

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
    if (newPanes.length && targetKey === currentPaneActiveKey) {
      const index =
        targetIndex === newPanes.length ? targetIndex - 1 : targetIndex;
      const { key } = newPanes[index];
      onChangeCurrentPaneActiveKey(key.toString());
      setSelectNodeKeys([`0-${key}-${newPanes[index].title}`]);
      changeOpenNodeId(parseInt(key));
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
    if (panes.length == 0) {
      setSelectNodeKeys([]);
      changeOpenNodeId(undefined);
    }
  }, [panes]);

  return (
    <div className={TemporaryQueryStyle.queryMain}>
      <FolderTree />
      <div className={TemporaryQueryStyle.content}>
        {selectNode?.id && panes?.length > 0 ? (
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
