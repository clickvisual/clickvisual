import { ShareAltOutlined } from "@ant-design/icons";
import { Button, message, Tooltip } from "antd";
import copy from "copy-to-clipboard";
import { useIntl } from "umi";

const UrlShareButton = (props: { style?: any; text?: string }) => {
  const { style, text } = props;
  const i18n = useIntl();

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
    <Tooltip title={i18n.formatMessage({ id: "log.share" })}>
      <Button onClick={handleShare} style={style} icon={<ShareAltOutlined />}>
        {text}
      </Button>
    </Tooltip>
  );
};
export default UrlShareButton;
