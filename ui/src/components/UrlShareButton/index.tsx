import { ShareAltOutlined } from "@ant-design/icons";
import { Button, message } from "antd";
import copy from "copy-to-clipboard";
import { useIntl } from "umi";

const UrlShareButton = (props: { style?: any }) => {
  const { style } = props;
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
    <Button onClick={handleShare} style={style} icon={<ShareAltOutlined />}>
      {i18n.formatMessage({ id: "log.share" })}
    </Button>
  );
};
export default UrlShareButton;
