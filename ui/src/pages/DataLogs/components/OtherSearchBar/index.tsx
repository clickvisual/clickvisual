import { Button, message } from "antd";
import IconFont from "@/components/IconFont";
import { PaneType } from "@/models/datalogs/types";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useMemo } from "react";
import { QueryTypeEnum } from "@/config/config";
import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";
import copy from "copy-to-clipboard";
import useUrlState from "@ahooksjs/use-url-state";
import { ShareAltOutlined } from "@ant-design/icons";

const OtherSearchBar = ({
  isShare,
  isShowSwitch,
}: {
  isShare: boolean;
  isShowSwitch: boolean;
}) => {
  const [usrState] = useUrlState<any>();
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
    console.log("{ ...(oldPane as PaneType), queryType }", {
      ...(oldPane as PaneType),
      queryType,
    });
  };

  useEffect(() => {
    if (usrState?.mode == 1) {
      handleClick();
    }
  }, [usrState?.mode]);

  const handleShare = () => {
    try {
      message.success(i18n.formatMessage({ id: "log.share.success" }));
      copy(window.location.href);
    } catch (e) {
      console.log("【Copy Share Error】: ", e);
      message.success(i18n.formatMessage({ id: "log.share.error" }));
    }
  };

  return (
    <>
      {isShare && (
        <Button
          onClick={handleShare}
          className={searchBarStyles.checkBtn}
          style={{ marginRight: "8px" }}
          icon={<ShareAltOutlined />}
        >
          {i18n.formatMessage({ id: "log.share" })}
        </Button>
      )}
      {isShowSwitch && (
        <Button
          onClick={handleClick}
          className={searchBarStyles.checkBtn}
          icon={<IconFont type={"icon-switch"} />}
        ></Button>
      )}
    </>
  );
};
export default OtherSearchBar;
