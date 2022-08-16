import styles from "./index.less";
import CustomCard from "@/components/CustomCard";
import { useMemo } from "react";
import ItemCard from "./ItemCard";
import IconFont from "@/components/IconFont";
import { dashboardDataType } from "../..";
import { useIntl } from "umi";

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

const DashboardTop = (props: { dashboardData: dashboardDataType }) => {
  const i18n = useIntl();
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
        name: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.failureInstance",
        }),
        icon: "icon-failure-instance",
        num: workerFailed,
      },
      {
        key: IconFontListType.successfulInstance,
        name: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.successfulInstance",
        }),
        icon: "icon-successful-instance",
        num: workerSuccess,
      },
      {
        key: IconFontListType.unknownInstance,
        name: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.unknownInstance",
        }),
        icon: "icon-unknown-instance",
        num: workerUnknown,
      },
      {
        key: IconFontListType.failureNode,
        name: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.failureNode",
        }),
        icon: "icon-failure-node",
        num: nodeFailed,
      },
      {
        key: IconFontListType.successfulNode,
        name: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.successfulNode",
        }),
        icon: "icon-successful-node",
        num: nodeSuccess,
      },
      {
        key: IconFontListType.unknownNode,
        name: i18n.formatMessage({
          id: "bigdata.dataAnalysis.statisticalBoard.Screening.unknownNode",
        }),
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

  return (
    <CustomCard
      title={i18n.formatMessage({
        id: "bigdata.dataAnalysis.statisticalBoard.DashboardTop.title",
      })}
      content={content}
    />
  );
};

export default DashboardTop;
