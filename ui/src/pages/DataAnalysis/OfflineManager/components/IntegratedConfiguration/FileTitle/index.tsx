import IntegratedConfigurationStyle from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/index.less";
import {
  LockOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import { Button, Space, Tooltip } from "antd";
import { useModel } from "umi";
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

  if (!file) return null;

  return (
    <div className={IntegratedConfigurationStyle.fileTitle}>
      <Space>
        <div className={IntegratedConfigurationStyle.name}>
          节点: {file.name}
        </div>
        {(!file.lockUid || file.lockUid === 0) && (
          <Tooltip title={"锁定后可编辑"}>
            <Button
              type={"link"}
              onClick={() => onLock(file)}
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
                  onClick={() => onUnlock(file)}
                  icon={<UnlockOutlined />}
                />
              </Tooltip>
            )}
            {file.lockUid
              ? "用户: " + (file.username || "无效用户") + "正在编辑"
              : ""}
            {file?.lockUid == currentUser?.id && (
              <Tooltip title={"保存"}>
                <Button
                  type={"link"}
                  onClick={() => onSave()}
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
            onClick={() => onRun(file)}
            icon={<PlayCircleOutlined />}
          />
        </Tooltip>
        {/*  todo: 0 无状态 1 待执行 2 执行中 3 执行异常 4 执行完成 枚举 */}
        {file.status === 3 && (
          <Tooltip title={"暂停"}>
            <Button
              type={"link"}
              disabled={
                (!file.lockUid && file.lockUid === 0) ||
                file.lockUid !== currentUser?.id
              }
              onClick={() => onStop(file)}
              icon={<PauseCircleOutlined />}
            />
          </Tooltip>
        )}
      </Space>
    </div>
  );
};
export default FileTitle;
