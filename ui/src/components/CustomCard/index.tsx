import styles from "./index.less";

export interface CustomCardType {
  title: any;
  operation?: any;
  content: any;
  style?: any;
}

const CustomCard = (props: CustomCardType) => {
  const { title, operation, content, style } = props;
  return (
    <div className={styles.CustomCard} style={style}>
      <div className={styles.titleBox}>
        <div className={styles.title}>{title}</div>
        <div className={styles.operation}>{operation}</div>
      </div>
      <div className={styles.content}>{content}</div>
    </div>
  );
};
export default CustomCard;
