import darkTimeStyles from "@/pages/DataLogs/components/DateTimeSelected/index.less";
import { Tabs } from "antd";
import CustomTimeInterval from "@/pages/DataLogs/components/DateTimeSelected/CustomTimeInterval";
import RelativeTime from "@/pages/DataLogs/components/DateTimeSelected/RelativeTime";
import { useModel } from "@@/plugin-model/useModel";
import { TimeRangeType } from "@/config/config";
import { DarkTimeContext } from "@/pages/DataLogs/components/DateTimeSelected";
import { useContext, useMemo } from "react";
import { PaneType } from "@/models/datalogs/types";
const { TabPane } = Tabs;

const DateTimeSelectedCard = (props: {
  onChangeVisble: (flag: boolean) => void;
}) => {
  const {
    logPanesHelper,
    activeTabKey,
    currentLogLibrary,
    onChangeActiveTabKey,
    onChangeCurrentLogPane,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;
  const { TabName } = useContext(DarkTimeContext);
  const { onChangeVisble } = props;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const onChangeActiveTab = (key: string) => {
    onChangeActiveTabKey(key);
    onChangeCurrentLogPane({ ...(oldPane as PaneType), activeTabKey: key });
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
          <RelativeTime onChangeVisble={onChangeVisble} />
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
