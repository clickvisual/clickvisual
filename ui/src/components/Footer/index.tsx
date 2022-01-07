import footerStyles from "@/components/Footer/style/index.less";

export default () => {
  const year = new Date().getFullYear();

  return (
    <footer className={footerStyles.footer}>
      <span>&copy;&nbsp;{year}&nbsp;&nbsp;武汉初心科技</span>
    </footer>
  );
};
