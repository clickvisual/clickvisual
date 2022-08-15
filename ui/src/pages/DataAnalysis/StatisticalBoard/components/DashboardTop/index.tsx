import styles from "./index.less";
import CustomCard from "@/components/CustomCard";
import { useMemo } from "react";
import ItemCard from "./ItemCard";
import IconFont from "@/components/IconFont";
import { dashboardDataType } from "../..";

enum IconFontListType {
  /**
   * 失败实例
   */
  failureInstance = "failureInstance",
  /**
   * 成功实例
   */
  successfulInstance = "successfulInstance",
  /**
   * 未知实例
   */
  unknownInstance = "unknownInstance",
  /**
   * 失败节点
   */
  failureNode = "failureNode",
  /**
   * 成功节点
   */
  successfulNode = "successfulNode",
  /**
   * 未知节点
   */
  unknownNode = "unknownNode",
}

const title = <>重点关注</>;

const DashboardTop = (props: { dashboardData: dashboardDataType }) => {
  const { dashboardData } = props;
  const {
    nodeFailed,
    nodeSuccess,
    nodeUnknown,
    workerFailed,
    workerSuccess,
    workerUnknown,
  } = dashboardData;

  const iconList = useMemo(() => {
    return [
      {
        key: IconFontListType.failureInstance,
        name: "失败实例",
        icon: "icon-failure-instance",
        num: workerFailed,
      },
      {
        key: IconFontListType.successfulInstance,
        name: "成功实例",
        icon: "icon-successful-instance",
        num: workerSuccess,
      },
      {
        key: IconFontListType.unknownInstance,
        name: "未知实例",
        icon: "icon-unknown-instance",
        num: workerUnknown,
      },
      {
        key: IconFontListType.failureNode,
        name: "失败节点",
        icon: "icon-failure-node",
        num: nodeFailed,
      },
      {
        key: IconFontListType.successfulNode,
        name: "成功节点",
        icon: "icon-successful-node",
        num: nodeSuccess,
      },
      {
        key: IconFontListType.unknownNode,
        name: "未知节点",
        icon: "icon-unknown-node",
        num: nodeUnknown,
        style: { marginRight: 0 },
      },
    ];
  }, [
    workerFailed,
    workerSuccess,
    workerUnknown,
    nodeFailed,
    nodeSuccess,
    nodeUnknown,
  ]);

  const content = useMemo(() => {
    return (
      <div className={styles.iconList}>
        {iconList.map((item: any) => {
          return (
            <ItemCard
              key={item.key}
              icon={<IconFont style={{ fontSize: "50px" }} type={item.icon} />}
              num={item.num}
              name={item.name}
              style={item.style}
            />
          );
        })}
      </div>
    );
  }, [iconList]);

  return <CustomCard title={title} content={content} />;
};

export default DashboardTop;
