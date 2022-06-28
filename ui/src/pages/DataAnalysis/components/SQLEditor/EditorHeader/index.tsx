import style from "@/pages/DataAnalysis/components/SQLEditor/index.less";
import { Button, Tooltip } from "antd";
import {
  FormatPainterOutlined,
  LockOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import { useModel } from "umi";
import { format } from "sql-formatter";
import classNames from "classnames";

const EditorHeader = () => {
  const {
    openNodeData,
    folderContent,
    changeFolderContent,
    isUpdateStateFun,
    openNodeId,
    // sqlTitle
    handleLockFile,
    handleUnLockFile,
    handleSaveNode,
    handleRunCode,
  } = useModel("dataAnalysis");
  const { currentUser } = useModel("@@initialState").initialState || {};

  const isRun: boolean = Boolean(currentUser?.id == openNodeData?.lockUid);

  return (
    <div className={style.header}>
      <div className={style.headerList}>
        {openNodeData?.id && (
          // <div className={style.headerTitle}>
          <div
            className={classNames([
              style.headerTitle,
              isUpdateStateFun() ? style.headerTitleTips : "",
            ])}
          >
            节点: {openNodeData?.name}
            {!openNodeData.lockUid ? (
              <Tooltip title={"锁定后可编辑"} defaultVisible>
                <Button
                  type={"link"}
                  onClick={() => handleLockFile(openNodeId as number)}
                  icon={<LockOutlined />}
                />
              </Tooltip>
            ) : currentUser?.id == openNodeData.lockUid ? (
              <Tooltip title={"解锁后退出编辑"} defaultVisible>
                <Button
                  type={"link"}
                  onClick={() => handleUnLockFile(openNodeId as number)}
                  icon={<UnlockOutlined />}
                />
              </Tooltip>
            ) : (
              <>&nbsp;&nbsp;</>
            )}
            {openNodeData.lockUid
              ? "用户: " + (openNodeData.username || "无效用户") + "正在编辑"
              : ""}
          </div>
        )}
        {/* 修改后且锁定者为自己才可见 */}
        {isUpdateStateFun() && isRun && (
          <Tooltip title={"保存"}>
            <Button
              type={"link"}
              onClick={() => handleSaveNode()}
              icon={<SaveOutlined />}
            />
          </Tooltip>
        )}
        {/* 锁定者为自己才可以格式化 */}
        {isRun && (
          <Tooltip title={"格式化 SQL"}>
            <Button
              type={"link"}
              onClick={() => {
                changeFolderContent(format(folderContent));
              }}
              icon={<FormatPainterOutlined />}
            />
          </Tooltip>
        )}
        {folderContent.length > 0 && !isUpdateStateFun() && (
          <Tooltip title={isRun ? "运行" : "无法运行"}>
            <Button
              type={"link"}
              onClick={() => {
                if (openNodeData?.lockUid) {
                  handleRunCode(openNodeId as number);
                }
              }}
              icon={
                <PlayCircleOutlined
                  style={{
                    color: isRun ? "" : "#ccc",
                  }}
                />
              }
            />
          </Tooltip>
        )}
      </div>
      {openNodeData?.id && <div>{isRun ? "可编辑" : "只读：锁定后可编辑"}</div>}
    </div>
  );
};

export default EditorHeader;
