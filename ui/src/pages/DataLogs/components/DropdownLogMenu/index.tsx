import { Button, Space } from "antd";
import IconFont from "@/components/IconFont";
import { PaneType, QueryTypeMenuItems } from "@/models/datalogs/types";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { useMemo } from "react";
import { QueryTypeEnum } from "@/config/config";
import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";

const DropdownLogMenu = ({ isShare }: { isShare: boolean }) => {
  const {
    statisticalChartsHelper,
    logPanesHelper,
    currentLogLibrary,
    onChangeCurrentLogPane,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;
  const { activeQueryType, setActiveQueryType } = statisticalChartsHelper;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const i18n = useIntl();

  const handleClick = () => {
    const queryType =
      activeQueryType === QueryTypeEnum.LOG
        ? QueryTypeEnum.TABLE
        : QueryTypeEnum.LOG;
    setActiveQueryType(queryType);
    onChangeCurrentLogPane({ ...(oldPane as PaneType), queryType });
  };

  if (isShare) {
    return <></>;
  }

  return (
    <Button onClick={handleClick} className={searchBarStyles.checkBtn}>
      <Space>
        <span>
          {i18n.formatMessage({
            id: QueryTypeMenuItems.find((item) => item.key === activeQueryType)
              ?.labelId,
          })}
        </span>
        <IconFont type={"icon-switch"} />
      </Space>
    </Button>
  );
};
export default DropdownLogMenu;
