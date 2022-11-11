import styles from "./index.less";
import { BarsOutlined, PlusCircleFilled } from "@ant-design/icons";
import { useModel } from "umi";
import { Button } from "antd";

const WhereBox = () => {
  const { onChangeVisibleLogFilter, isShare } = useModel("dataLogs");

  return (
    <span className={styles.whereBox}>
      {/* <span>
        <BarsOutlined />
      </span> */}
      <Button
        type="link"
        disabled={isShare}
        onClick={() => {
          onChangeVisibleLogFilter(true);
        }}
        icon={<PlusCircleFilled />}
      ></Button>
    </span>
  );
};
export default WhereBox;
