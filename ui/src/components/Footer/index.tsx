import footerStyles from "@/components/Footer/style/index.less";
import { useIntl } from "umi";
import { Space } from "antd";
import IconFont from "@/components/IconFont";

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

        <a href="https://github.com/shimohq/mogo" target="_blank">
          <IconFont type={"icon-github"} />
        </a>
        <a href="https://shimo.im/welcome" target="_blank">
          <IconFont type={"icon-shimo"} />
        </a>
      </Space>
    </footer>
  );
};
