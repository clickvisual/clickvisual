import { Button, message } from "antd";
import IconFont from "@/components/IconFont";
import { PaneType, QueryTypeMenuItems } from "@/models/datalogs/types";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { useMemo } from "react";
import { QueryTypeEnum } from "@/config/config";
import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";
import copy from "copy-to-clipboard";
import { ShareAltOutlined } from "@ant-design/icons";

const OtherSearchBar = ({ isShare }: { isShare: boolean }) => {
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

  const handleShare = () => {
    try {
      message.success(i18n.formatMessage({ id: "log.share.success" }));
      copy(window.location.href);
    } catch (e) {
      console.log("【Copy Share Error】: ", e);
      message.success(i18n.formatMessage({ id: "log.share.error" }));
    }
  };

  if (isShare) {
    return (
      <Button
        onClick={handleShare}
        className={searchBarStyles.checkBtn}
        icon={<ShareAltOutlined />}
      >
        {i18n.formatMessage({ id: "log.share" })}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      className={searchBarStyles.checkBtn}
      icon={<IconFont type={"icon-switch"} />}
    >
      {i18n.formatMessage({
        id: QueryTypeMenuItems.find((item) => item.key === activeQueryType)
          ?.labelId,
      })}
    </Button>
  );
};
export default OtherSearchBar;
