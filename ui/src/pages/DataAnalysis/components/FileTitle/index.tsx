import styles from "@/pages/DataAnalysis/components/FileTitle/index.less";
import {
  LockOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import { Button, Space, Tooltip } from "antd";
import { useModel } from "umi";
import { NodeRunningStatusEnums } from "@/pages/DataAnalysis/OfflineManager/config";
import { useThrottleFn } from "ahooks";
import { THROTTLE_WAIT } from "@/config/config";
export interface FileTitleProps {
  file: any;
  onSave: () => void;
  onLock: (file: any) => void;
  onUnlock: (file: any) => void;
  onRun: (file: any) => void;
  onStop: (file: any) => void;
}
const FileTitle = ({
  file,
  onSave,
  onLock,
  onUnlock,
  onRun,
  onStop,
}: FileTitleProps) => {
  const { currentUser } = useModel("@@initialState").initialState || {};

  const handleSave = useThrottleFn(onSave, { wait: THROTTLE_WAIT }).run;
  const handleRun = useThrottleFn(onRun, { wait: THROTTLE_WAIT }).run;
  const handleStop = useThrottleFn(onStop, { wait: THROTTLE_WAIT }).run;
  const handleLock = useThrottleFn(onLock, { wait: THROTTLE_WAIT }).run;
  const handleUnlock = useThrottleFn(onUnlock, { wait: THROTTLE_WAIT }).run;

  return (
    <div className={styles.fileTitle}>
      {!!file && (
        <>
          <div className={styles.name}>{file.name}</div>
          <div className={styles.status}>
            {file.lockUid ? `${file.username || "无效用户"} 正在编辑` : ""}
          </div>
          <div className={styles.icons}>
            <Space>
              {(!file.lockUid || file.lockUid === 0) && (
                <Tooltip title={"锁定后可编辑"}>
                  <Button
                    type={"link"}
                    onClick={() => handleLock(file)}
                    icon={<LockOutlined />}
                  />
                </Tooltip>
              )}
              {(file.lockUid || file.lockUid !== 0) && (
                <>
                  {currentUser?.id === file.lockUid && (
                    <Tooltip title={"解锁后退出编辑"}>
                      <Button
                        type={"link"}
                        onClick={() => handleUnlock(file)}
                        icon={<UnlockOutlined />}
                      />
                    </Tooltip>
                  )}
                  {file?.lockUid == currentUser?.id && (
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
              {file.status === NodeRunningStatusEnums.inProgress && (
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
