import styles from "./index.less";
import { BarsOutlined, PlusCircleFilled } from "@ant-design/icons";
import { useModel } from "umi";

const WhereBox = () => {
  const { onChangeVisibleLogFilter } = useModel("dataLogs");

  return (
    <span className={styles.whereBox}>
      {/* <span>
        <BarsOutlined />
      </span> */}
      <span onClick={() => onChangeVisibleLogFilter(true)}>
        <PlusCircleFilled />
      </span>
    </span>
  );
};
export default WhereBox;
