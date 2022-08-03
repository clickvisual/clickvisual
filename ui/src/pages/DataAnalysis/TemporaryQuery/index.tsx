import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import FolderTree from "@/pages/DataAnalysis/components/FolderTree";
import { Tabs } from "antd";
import { useState } from "react";
import SQLTabPaneItem from "./components/SQLTabPaneItem";

const { TabPane } = Tabs;

const defaultPanes = Array.from({ length: 1 }).map((_, index) => {
  const id = String(index + 1);
  return {
    title: `Tab ${id}`,
    key: id,
  };
});

const TemporaryQuery = () => {
  const [activeKey, setActiveKey] = useState(defaultPanes[0].key);
  const [panes, setPanes] = useState(defaultPanes);

  const onChange = (key: string) => {
    setActiveKey(key);
  };

  return (
    <div className={TemporaryQueryStyle.queryMain}>
      <FolderTree />
      <div className={TemporaryQueryStyle.content}>
        <Tabs
          hideAdd
          onChange={onChange}
          activeKey={activeKey}
          type="editable-card"
          // onEdit={onEdit}
          className={TemporaryQueryStyle.fileNameList}
        >
          {panes.map((pane: any) => (
            <TabPane
              tab={pane.title}
              key={pane.key}
              forceRender
              style={{ background: "#fff", width: "100%" }}
            >
              <SQLTabPaneItem />
            </TabPane>
          ))}
        </Tabs>
      </div>
    </div>
  );
};
export default TemporaryQuery;
