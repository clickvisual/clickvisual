import { RightOutlined } from "@ant-design/icons";
import classNames from "classnames";
import styles from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/NodeManage/styles/index.less";
import {
  SecondaryEnums,
  TertiaryEnums,
} from "@/pages/DataAnalysis/service/enums";
import { useMemo, useState } from "react";
import { Empty } from "antd";

export interface NodeManageProps {
  isLock: boolean;
}
const NodeManage = ({ isLock }: NodeManageProps) => {
  return (
    <div
      style={{
        flex: "0 0 180px",
        minHeight: 0,
        overflowY: "auto",
        borderRight: "1px solid hsla(0, 0%, 0%, 0.1)",
      }}
    >
      <NodeModule
        isLock={isLock}
        nodeSecondary={SecondaryEnums.dataIntegration}
      />
      <NodeModule isLock={isLock} nodeSecondary={SecondaryEnums.dataMining} />
      <NodeModule isLock={isLock} nodeSecondary={SecondaryEnums.universal} />
    </div>
  );
};

const NodeModule = ({
  nodeSecondary,
  isLock,
}: {
  nodeSecondary: SecondaryEnums;
  isLock: boolean;
}) => {
  const [isFold, setIsFold] = useState<boolean>(false);

  const onDragStart = (
    event: any,
    nodeType: any,
    tertiary: TertiaryEnums,
    secondary: SecondaryEnums
  ) => {
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({ nodeType, tertiary, secondary })
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const title = useMemo(() => {
    switch (nodeSecondary) {
      case SecondaryEnums.dataMining:
        return "数据开发";
      case SecondaryEnums.dataIntegration:
        return "数据集成";
      case SecondaryEnums.universal:
        return "通用";
      default:
        return "";
    }
  }, [nodeSecondary]);

  const NodeTypes = useMemo(() => {
    switch (nodeSecondary) {
      case SecondaryEnums.dataMining:
        return (
          <div>
            <div
              draggable={!isLock}
              className={styles.nodeSelect}
              onDragStart={(event) =>
                onDragStart(
                  event,
                  "default",
                  TertiaryEnums.mysql,
                  nodeSecondary
                )
              }
            >
              <span>MySQL</span>
            </div>
            <div
              draggable={!isLock}
              className={styles.nodeSelect}
              onDragStart={(event) =>
                onDragStart(
                  event,
                  "default",
                  TertiaryEnums.clickhouse,
                  nodeSecondary
                )
              }
            >
              <span>ClickHouse</span>
            </div>
          </div>
        );
      case SecondaryEnums.dataIntegration:
        return (
          <div>
            <div
              draggable={!isLock}
              className={styles.nodeSelect}
              onDragStart={(event) =>
                onDragStart(
                  event,
                  "default",
                  TertiaryEnums.realtime,
                  nodeSecondary
                )
              }
            >
              <span>实时同步</span>
            </div>
          </div>
        );

      case SecondaryEnums.universal:
        return (
          <div>
            <div
              draggable={!isLock}
              className={styles.nodeSelect}
              onDragStart={(event) =>
                onDragStart(event, "input", TertiaryEnums.input, nodeSecondary)
              }
            >
              <span>Start</span>
            </div>
            <div
              draggable={!isLock}
              className={styles.nodeSelect}
              onDragStart={(event) =>
                onDragStart(
                  event,
                  "output",
                  TertiaryEnums.output,
                  nodeSecondary
                )
              }
            >
              <span>End</span>
            </div>
          </div>
        );
      default:
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
  }, [nodeSecondary, isLock]);

  return (
    <div className={styles.main}>
      <div className={styles.title} onClick={() => setIsFold(() => !isFold)}>
        <RightOutlined
          className={classNames(styles.icon, !isFold && styles.iconExpand)}
        />
        <span>{title}</span>
      </div>
      {!isFold && NodeTypes}
    </div>
  );
};
export default NodeManage;
