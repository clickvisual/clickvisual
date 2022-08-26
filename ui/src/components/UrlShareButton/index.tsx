import { ShareAltOutlined } from "@ant-design/icons";
import { Button, message, Tooltip } from "antd";
import copy from "copy-to-clipboard";
import api from "@/services/dataLogs";
import useRequest from "@/hooks/useRequest/useRequest";
import { useIntl } from "umi";

const UrlShareButton = (props: { style?: any; text?: string }) => {
  const { style, text } = props;
  const i18n = useIntl();

  const doGetShorturls = useRequest(api.getShorturls, {
    loadingText: false,
  });

  const handleShare = () => {
    try {
      doGetShorturls
        .run({ originUrl: window.location.href })
        .then((res: any) => {
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
      <Button onClick={handleShare} style={style} icon={<ShareAltOutlined />}>
        {text}
      </Button>
    </Tooltip>
  );
};
export default UrlShareButton;
