import darkTimeStyles from "@/pages/DataLogs/components/DateTimeSelected/index.less";
import { Tabs } from "antd";
import CustomTimeInterval from "@/pages/DataLogs/components/DateTimeSelected/CustomTimeInterval";
import RelativeTime from "@/pages/DataLogs/components/DateTimeSelected/RelativeTime";
import { useModel } from "@@/plugin-model/useModel";
import { TimeRangeType } from "@/config/config";
import { DarkTimeContext } from "@/pages/DataLogs/components/DateTimeSelected";
import { useContext } from "react";
import { PaneType } from "@/models/dataLogs";
const { TabPane } = Tabs;
type DarkTimeSelectedCardProps = {};
const DateTimeSelectedCard = (props: DarkTimeSelectedCardProps) => {
  const {
    logPanes,
    activeTabKey,
    currentLogLibrary,
    onChangeActiveTabKey,
    onChangeLogPane,
  } = useModel("dataLogs");
  const { TabName } = useContext(DarkTimeContext);

  const oldPane = logPanes.find(
    (item) => item.pane === currentLogLibrary
  ) as PaneType;

  const onChangeActiveTab = (key: string) => {
    onChangeActiveTabKey(key);
    onChangeLogPane({ ...oldPane, activeTabKey: key });
  };
  return (
    <div className={darkTimeStyles.darkTimeSelectCard}>
      <Tabs
        tabBarStyle={{ padding: 0 }}
        activeKey={activeTabKey}
        size="small"
        onTabClick={onChangeActiveTab}
        defaultActiveKey={activeTabKey}
      >
        <TabPane
          forceRender
          tab={TabName[TimeRangeType.Relative]}
          key={TimeRangeType.Relative}
        >
          <RelativeTime />
        </TabPane>
        <TabPane
          forceRender
          tab={TabName[TimeRangeType.Custom]}
          key={TimeRangeType.Custom}
        >
          <CustomTimeInterval />
        </TabPane>
      </Tabs>
    </div>
  );
};
export default DateTimeSelectedCard;
