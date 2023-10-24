import footerStyles from "@/components/Footer/style/index.less";
import {useIntl} from "umi";
import {Space} from "antd";

export default () => {
  const i18n = useIntl();

  return (
    <footer className={footerStyles.footer}>
      <Space>
        <span>
          {i18n.formatMessage({
            id: "footer.copyright",
          })}
        </span>
      </Space>
    </footer>
  );
};
