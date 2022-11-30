import { ShareAltOutlined } from "@ant-design/icons";
import { Button, message, Tooltip } from "antd";
import copy from "copy-to-clipboard";
import api from "@/services/dataLogs";
import useRequest from "@/hooks/useRequest/useRequest";
import { useIntl, useModel } from "umi";
import useUrlState from "@ahooksjs/use-url-state";
import { cloneDeep } from "lodash";

const UrlShareButton = (props: { style?: any; text?: string }) => {
  const { style, text } = props;
  const i18n = useIntl();
  const { logs, logsLoading, highChartLoading } = useModel("dataLogs");
  const [urlState] = useUrlState();

  const doGetShorturls = useRequest(api.getShorturls, {
    loadingText: false,
  });

  const handleShare = () => {
    try {
      const urlData = cloneDeep(urlState);
      let str: string = "";
      Object.keys(urlData).map((item: any) => {
        if (item == "kw") {
          const arr = logs?.where
            .split(" AND ")
            .filter((item: any) => item != "1='1'");
          str += `${item}=${arr?.join(" AND ")}&`;
        } else {
          str += `${item}=${urlData[item]}&`;
        }
      });
      if (!Object.keys(urlData).includes("kw")) {
        const arr = logs?.where
          .split(" AND ")
          .filter((item: any) => item != "1='1'");
        str += `kw=${arr?.join(" AND ")}&`;
      }
      let url = "";
      if (window.location.href.indexOf("share?") > -1) {
        url = window.location.href;
      } else {
        url = `${window.location.href.split("query")[0]}share?${str.slice(
          0,
          -1
        )}`;
      }
      doGetShorturls.run({ originUrl: url }).then((res: any) => {
        if (res.code != 0) return;
        message.success(i18n.formatMessage({ id: "log.share.success" }));
        copy(res.data);
      });
    } catch (e) {
      console.log("【Copy Share Error】: ", e);
      message.success(i18n.formatMessage({ id: "log.share.error" }));
    }
  };

  return (
    <Tooltip title={i18n.formatMessage({ id: "log.share" })}>
      <Button
        onClick={handleShare}
        style={style}
        loading={logsLoading || highChartLoading}
        icon={<ShareAltOutlined />}
      >
        {text}
      </Button>
    </Tooltip>
  );
};
export default UrlShareButton;
