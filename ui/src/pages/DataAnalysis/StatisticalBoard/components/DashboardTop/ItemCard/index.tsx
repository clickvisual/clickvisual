import styles from "./index.less";
const ItemCard = (props: {
  icon: any;
  num: number;
  name: string;
  style?: any;
}) => {
  const { icon, num, name, style } = props;
  return (
    <div className={styles.ItemCard} style={style}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.num}>{num}</div>
      <div className={styles.name}>{name}</div>
    </div>
  );
};
export default ItemCard;
