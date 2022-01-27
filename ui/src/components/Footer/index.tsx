import footerStyles from "@/components/Footer/style/index.less";
import { useIntl } from "umi";

export default () => {
  const i18n = useIntl();

  return (
    <footer className={footerStyles.footer}>
      <span>
        {i18n.formatMessage({
          id: "footer.copyright",
        })}
      </span>
    </footer>
  );
};
