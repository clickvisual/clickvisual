import styles from "@/pages/DataAnalysis/components/FileTitle/index.less";
import {
  FormatPainterOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { Button, Space, Spin, Tooltip } from "antd";
import { useModel } from "umi";
import { NodeRunningStatusEnums } from "@/pages/DataAnalysis/OfflineManager/config";
import { useThrottleFn } from "ahooks";
import { THROTTLE_WAIT } from "@/config/config";
import classNames from "classnames";
import { useMemo } from "react";
import {
  SecondaryEnums,
  TertiaryEnums,
} from "@/pages/DataAnalysis/service/enums";
import SVGIcon, { SVGTypeEnums } from "@/components/SVGIcon";

export enum FileTitleType {
  node = "node",
  sql = "sql",
}

export interface FileTitleProps {
  file: any;
  onSave: () => void;
  onLock: (file: any) => void;
  onUnlock: (file: any) => void;
  onRun: (file: any) => void;
  onStop?: (file: any) => void;
  onFormat?: () => void;
  type: FileTitleType;
  /**
   * 是否发生改变，true 为是，false 为否
   */
  isChange: boolean;
}
const FileTitle = ({
  file,
  onSave,
  onLock,
  onUnlock,
  type,
  onFormat,
  onRun,
  onStop,
  isChange,
}: FileTitleProps) => {
  const { currentUser } = useModel("@@initialState").initialState || {};
  const {
    doLockNode,
    doUnLockNode,
    doRunCodeNode,
    doStopCodeNode,
    selectNode,
  } = useModel("dataAnalysis", (model) => ({
    doLockNode: model.manageNode.doLockNode,
    doUnLockNode: model.manageNode.doUnLockNode,
    doRunCodeNode: model.manageNode.doRunCodeNode,
    doStopCodeNode: model.manageNode.doStopCodeNode,
    selectNode: model.manageNode.selectNode,
  }));

  const fileType = useMemo(() => {
    if (selectNode.secondary === SecondaryEnums.board) {
      return (
        <div>
          <Space>
            {/*<SVGIcon type={SVGTypeEnums.board} />*/}
            <span>看板</span>
          </Space>
        </div>
      );
    }
    switch (selectNode.tertiary) {
      case TertiaryEnums.mysql:
        return (
          <Space>
            <SVGIcon type={SVGTypeEnums.mysql} />
            <span>MySQL</span>
          </Space>
        );
      case TertiaryEnums.clickhouse:
        return (
          <Space>
            <SVGIcon type={SVGTypeEnums.clickhouse} />
            <span>ClickHouse</span>
          </Space>
        );
      case TertiaryEnums.realtime:
        return (
          <Space>
            <SVGIcon type={SVGTypeEnums.realtime} />
            <span>实时同步</span>
          </Space>
        );
      case TertiaryEnums.offline:
        return (
          <Space>
            <SVGIcon type={SVGTypeEnums.offline} />
            <span>离线同步</span>
          </Space>
        );
      default:
        return (
          <Space>
            <SVGIcon type={SVGTypeEnums.default} />
            <span>未知文件</span>
          </Space>
        );
    }
  }, [selectNode]);

  const NodeStatus = useMemo(() => {
    switch (file?.status) {
      case NodeRunningStatusEnums.pending:
        return "等待定时任务";
      case NodeRunningStatusEnums.inProgress:
        return "执行中";
      case NodeRunningStatusEnums.ExecutionException:
        return "执行异常";
      case NodeRunningStatusEnums.ExecuteComplete:
        return "执行完成";
      case NodeRunningStatusEnums.PendingRun:
        return "待执行";
      default:
        return "";
    }
  }, [file]);

  const handleSave = useThrottleFn(onSave, { wait: THROTTLE_WAIT }).run;
  const handleRun = useThrottleFn(onRun, { wait: THROTTLE_WAIT }).run;
  const handleStop = useThrottleFn(
    (file: any) => {
      onStop?.(file);
    },
    { wait: THROTTLE_WAIT }
  ).run;
  const handleLock = useThrottleFn(onLock, { wait: THROTTLE_WAIT }).run;
  const handleUnlock = useThrottleFn(onUnlock, { wait: THROTTLE_WAIT }).run;
  const handleFormat = useThrottleFn(
    () => {
      onFormat?.();
    },
    { wait: THROTTLE_WAIT }
  ).run;

  return (
    <div className={styles.fileTitle}>
      {!!file && (
        <>
          <div style={{ width: "200px", display: "flex" }}>
            <div
              className={classNames(styles.name, isChange && styles.nameChange)}
            >
              {fileType}
            </div>
            {/* 1 等待定时任务 2 执行中 3 执行异常 4 执行完成 5 待执行 */}
            {file.status !== 0 && (
              <div className={styles.statusText}>
                <span>{NodeStatus}</span>
              </div>
            )}
          </div>
          <div className={styles.userStatus}>
            {file.lockUid && file.lockUid !== 0
              ? `${file.username || "无效用户"} 正在编辑`
              : "只读"}
          </div>
          <div className={styles.icons}>
            <Space>
              <Spin
                size={"small"}
                indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />}
                spinning={doLockNode.loading || doUnLockNode.loading}
              />
              {(!file.lockUid || file.lockUid === 0) && (
                <Button
                  size={"small"}
                  type={"primary"}
                  onClick={() => handleLock(file)}
                >
                  开始编辑
                </Button>
              )}
              {(file.lockUid || file.lockUid !== 0) && (
                <>
                  {currentUser?.id === file.lockUid && (
                    <Button
                      size={"small"}
                      type={"primary"}
                      onClick={() => handleUnlock(file)}
                    >
                      退出编辑
                    </Button>
                  )}
                  {file?.lockUid == currentUser?.id && isChange && (
                    <Tooltip title={"保存"}>
                      <Button
                        type={"link"}
                        onClick={handleSave}
                        icon={<SaveOutlined />}
                      />
                    </Tooltip>
                  )}
                </>
              )}
              {type == FileTitleType.sql && file.lockUid == currentUser?.id && (
                <Tooltip title={"格式化"}>
                  <Button
                    type={"link"}
                    onClick={() => handleFormat()}
                    icon={<FormatPainterOutlined />}
                  />
                </Tooltip>
              )}
              {!isChange && file.status !== NodeRunningStatusEnums.inProgress && (
                <Tooltip title={"运行"}>
                  <Button
                    type={"link"}
                    disabled={
                      (!file.lockUid && file.lockUid === 0) ||
                      file.lockUid !== currentUser?.id ||
                      doRunCodeNode.loading
                    }
                    onClick={() => handleRun(file)}
                    icon={<PlayCircleOutlined />}
                  />
                </Tooltip>
              )}
              {type === FileTitleType.node &&
                file.status === NodeRunningStatusEnums.inProgress && (
                  <Tooltip title={"暂停"}>
                    <Button
                      type={"link"}
                      disabled={
                        (!file.lockUid && file.lockUid === 0) ||
                        file.lockUid !== currentUser?.id ||
                        doStopCodeNode.loading
                      }
                      onClick={() => handleStop(file)}
                      icon={<PauseCircleOutlined />}
                    />
                  </Tooltip>
                )}
            </Space>
          </div>
        </>
      )}
    </div>
  );
};
export default FileTitle;
