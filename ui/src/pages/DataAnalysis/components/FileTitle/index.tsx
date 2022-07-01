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
  const { doLockNode, doUnLockNode } = useModel("dataAnalysis", (model) => ({
    doLockNode: model.manageNode.doLockNode,
    doUnLockNode: model.manageNode.doUnLockNode,
  }));

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
          <div
            className={classNames(styles.name, isChange && styles.nameChange)}
          />
          <div className={styles.status}>
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
              {!isChange && (
                <Tooltip title={"运行"}>
                  <Button
                    type={"link"}
                    disabled={
                      (!file.lockUid && file.lockUid === 0) ||
                      file.lockUid !== currentUser?.id
                    }
                    onClick={() => handleRun(file)}
                    icon={<PlayCircleOutlined />}
                  />
                </Tooltip>
              )}
              {type === FileTitleType.node &&
                !isChange &&
                file.status === NodeRunningStatusEnums.inProgress && (
                  <Tooltip title={"暂停"}>
                    <Button
                      type={"link"}
                      disabled={
                        (!file.lockUid && file.lockUid === 0) ||
                        file.lockUid !== currentUser?.id
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
