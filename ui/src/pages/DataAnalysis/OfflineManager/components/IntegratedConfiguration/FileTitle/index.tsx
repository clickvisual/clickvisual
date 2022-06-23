import IntegratedConfigurationStyle from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/index.less";
import {
  LockOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useModel } from "umi";
export interface FileTitleProps {
  file: any;
}
const FileTitle = ({ file }: FileTitleProps) => {
  const {
    // sqlTitle
    handleLockFile,
    handleSaveNode,
    handleUnLockFile,
    handleRunCode,
  } = useModel("dataAnalysis");
  return (
    <div className={IntegratedConfigurationStyle.fileTitle}>
      <div className={IntegratedConfigurationStyle.name}>节点: {file.name}</div>
      <Tooltip title={"锁定后可编辑"}>
        <Button
          type={"link"}
          onClick={() => handleLockFile(0 as number)}
          icon={<LockOutlined />}
        />
      </Tooltip>
      <Tooltip title={"解锁后退出编辑"}>
        <Button
          type={"link"}
          onClick={() => handleUnLockFile(0 as number)}
          icon={<UnlockOutlined />}
        />
      </Tooltip>
      <Tooltip title={"保存"}>
        <Button
          type={"link"}
          onClick={() => handleSaveNode()}
          icon={<SaveOutlined />}
        />
      </Tooltip>
      <Tooltip title={"运行"}>
        <Button
          type={"link"}
          onClick={() => handleRunCode(0 as number)}
          icon={<PlayCircleOutlined />}
        />
      </Tooltip>
    </div>
  );
};
export default FileTitle;
