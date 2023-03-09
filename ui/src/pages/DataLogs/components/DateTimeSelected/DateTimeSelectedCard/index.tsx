import { TimeRangeType } from "@/config/config";
import { PaneType } from "@/models/datalogs/types";
import { DarkTimeContext } from "@/pages/DataLogs/components/DateTimeSelected";
import CustomTimeInterval from "@/pages/DataLogs/components/DateTimeSelected/CustomTimeInterval";
import darkTimeStyles from "@/pages/DataLogs/components/DateTimeSelected/index.less";
import RelativeTime from "@/pages/DataLogs/components/DateTimeSelected/RelativeTime";
import { useModel } from "@umijs/max";
import { Tabs } from "antd";
import { useContext, useMemo } from "react";

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

  const items = [
    {
      key: TimeRangeType.Relative,
      forceRender: true,
      label: TabName[TimeRangeType.Relative],
      children: <RelativeTime onChangeVisble={onChangeVisble} />,
    },
    {
      key: TimeRangeType.Custom,
      forceRender: true,
      label: TabName[TimeRangeType.Custom],
      children: <CustomTimeInterval />,
    },
  ];

  return (
    <div className={darkTimeStyles.darkTimeSelectCard}>
      <Tabs
        tabBarStyle={{ padding: 0 }}
        activeKey={activeTabKey}
        size="small"
        onTabClick={onChangeActiveTab}
        defaultActiveKey={activeTabKey}
        items={items}
      />
    </div>
  );
};
export default DateTimeSelectedCard;
