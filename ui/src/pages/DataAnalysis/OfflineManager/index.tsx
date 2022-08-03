import offlineStyles from "@/pages/DataAnalysis/OfflineManager/index.less";
import WorkflowTree from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree";
import { useRef, useState } from "react";
import { Tabs } from "antd";
import TabPaneItem from "./components/TabPaneItem";

const { TabPane } = Tabs;

const defaultPanes = Array.from({ length: 1 }).map((_, index) => {
  const id = String(index + 1);
  return {
    title: `Tab ${id}`,
    key: id,
  };
});

const OfflineManager = () => {
  const [activeKey, setActiveKey] = useState(defaultPanes[0].key);
  const [panes, setPanes] = useState(defaultPanes);
  const newTabIndex = useRef(0);

  const onChange = (key: string) => {
    setActiveKey(key);
  };

  const add = () => {
    const newActiveKey = `newTab${newTabIndex.current++}`;
    setPanes([...panes, { title: "New Tab", key: newActiveKey }]);
    setActiveKey(newActiveKey);
  };

  const remove = (targetKey: string) => {
    const targetIndex = panes.findIndex((pane) => pane.key === targetKey);
    const newPanes = panes.filter((pane) => pane.key !== targetKey);
    if (newPanes.length && targetKey === activeKey) {
      const { key } =
        newPanes[
          targetIndex === newPanes.length ? targetIndex - 1 : targetIndex
        ];
      setActiveKey(key);
    }
    setPanes(newPanes);
  };

  const onEdit = (targetKey: string, action: "add" | "remove") => {
    if (action === "add") {
      add();
    } else {
      remove(targetKey);
    }
  };

  return (
    <div className={offlineStyles.offlineMain} style={{ background: "#fff" }}>
      <div className={offlineStyles.right}>
        <WorkflowTree />
      </div>
      <div className={offlineStyles.content}>
        <div style={{ background: "#fafafa" }}>
          <Tabs
            hideAdd
            onChange={onChange}
            activeKey={activeKey}
            type="editable-card"
            // onEdit={onEdit}
            className={offlineStyles.fileNameList}
          >
            {panes.map((pane) => (
              <TabPane
                tab={pane.title}
                key={pane.key}
                forceRender
                style={{ background: "#fff" }}
              >
                <TabPaneItem />
              </TabPane>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
};
export default OfflineManager;
