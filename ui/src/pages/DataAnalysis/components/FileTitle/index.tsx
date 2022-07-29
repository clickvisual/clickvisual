import styles from "@/pages/DataAnalysis/components/FileTitle/index.less";
import {
  FormatPainterOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { Button, Space, Spin, Tooltip } from "antd";
import { useModel, useIntl } from "umi";
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
import moment from "moment";

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
  onGrabLock: (file: any) => void;
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
  onGrabLock,
  isChange,
}: FileTitleProps) => {
  const i18n = useIntl();
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
            <SVGIcon type={SVGTypeEnums.board} />
            <span>
              {i18n.formatMessage({
                id: "bigdata.components.RightMenu.Scheduling.secondary.board",
              })}
            </span>
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
            <span>
              {i18n.formatMessage({
                id: "bigdata.components.FileTitle.fileType.realtime",
              })}
            </span>
          </Space>
        );
      case TertiaryEnums.offline:
        return (
          <Space>
            <SVGIcon type={SVGTypeEnums.offline} />
            <span>
              {i18n.formatMessage({
                id: "bigdata.components.FileTitle.fileType.offline",
              })}
            </span>
          </Space>
        );
      default:
        return (
          <Space>
            <SVGIcon type={SVGTypeEnums.default} />
            <span>
              {i18n.formatMessage({
                id: "bigdata.components.FileTitle.fileType.default",
              })}
            </span>
          </Space>
        );
    }
  }, [selectNode]);

  const NodeStatus = useMemo(() => {
    switch (file?.status) {
      case NodeRunningStatusEnums.pending:
        return i18n.formatMessage({
          id: "bigdata.components.FileTitle.NodeStatus.pending",
        });
      case NodeRunningStatusEnums.inProgress:
        return i18n.formatMessage({
          id: "bigdata.components.FileTitle.NodeStatus.inProgress",
        });
      case NodeRunningStatusEnums.ExecutionException:
        return i18n.formatMessage({
          id: "bigdata.components.FileTitle.NodeStatus.ExecutionException",
        });
      case NodeRunningStatusEnums.ExecuteComplete:
        return i18n.formatMessage({
          id: "bigdata.components.FileTitle.NodeStatus.ExecuteComplete",
        });
      case NodeRunningStatusEnums.PendingRun:
        return i18n.formatMessage({
          id: "bigdata.components.FileTitle.NodeStatus.PendingRun",
        });
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
  const handleGrabLock = useThrottleFn(onGrabLock, { wait: THROTTLE_WAIT }).run;
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
          <div className={styles.nameBox}>
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
              ? `${
                  file.username ||
                  i18n.formatMessage({
                    id: "bigdata.components.FileTitle.user.invalidUser",
                  })
                } ${i18n.formatMessage({
                  id: "bigdata.components.FileTitle.user.editing",
                })} | `
              : i18n.formatMessage({
                  id: "bigdata.components.FileTitle.user.readOnly",
                })}
            {file.lockUid && file.lockUid !== 0 ? (
              <Tooltip
                title={moment(file.lockAt * 1000).format("YYYY-MM-DD hh:mm:ss")}
              >
                {moment(file.lockAt * 1000).format("MM-DD hh:mm:ss")}
              </Tooltip>
            ) : null}
          </div>
          <div className={styles.icons}>
            <Space>
              <Spin
                size={"small"}
                indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />}
                spinning={doLockNode.loading || doUnLockNode.loading}
              />
              {file.lockUid && file.lockUid !== currentUser?.id ? (
                <Button
                  size={"small"}
                  type={"primary"}
                  onClick={() => handleGrabLock(file)}
                >
                  {i18n.formatMessage({
                    id: "bigdata.components.FileTitle.grabTheLock",
                  })}
                </Button>
              ) : null}
              {(!file.lockUid || file.lockUid === 0) && (
                <Button
                  size={"small"}
                  type={"primary"}
                  onClick={() => handleLock(file)}
                >
                  {i18n.formatMessage({
                    id: "bigdata.components.FileTitle.startEditing",
                  })}
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
                      {i18n.formatMessage({
                        id: "bigdata.components.FileTitle.exitEditor",
                      })}
                    </Button>
                  )}
                </>
              )}
              {type == FileTitleType.sql && file.lockUid == currentUser?.id && (
                <Tooltip
                  title={i18n.formatMessage({
                    id: "bigdata.components.FileTitle.formatting",
                  })}
                >
                  <Button
                    type={"link"}
                    onClick={() => handleFormat()}
                    icon={<FormatPainterOutlined />}
                  />
                </Tooltip>
              )}
              {!isChange && file.status !== NodeRunningStatusEnums.inProgress && (
                <Tooltip
                  title={i18n.formatMessage({
                    id: "bigdata.components.FileTitle.run",
                  })}
                >
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
              {file?.lockUid == currentUser?.id && isChange && (
                <Tooltip title={i18n.formatMessage({ id: "button.save" })}>
                  <Button
                    type={"link"}
                    onClick={handleSave}
                    icon={<SaveOutlined />}
                  />
                </Tooltip>
              )}
              {type === FileTitleType.node &&
                file.status === NodeRunningStatusEnums.inProgress && (
                  <Tooltip
                    title={i18n.formatMessage({
                      id: "alarm.rules.switch.close",
                    })}
                  >
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
