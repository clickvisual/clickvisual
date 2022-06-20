import style from "@/pages/DataAnalysis/TemporaryQuery/components/SQLEditor/index.less";
import { Button, message, Tooltip } from "antd";
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
  const { temporaryQuery, changeSqlQueryResults, changeVisibleSqlQuery } =
    useModel("dataAnalysis");
  const {
    openNodeData,
    folderContent,
    changeFolderContent,
    isUpdateStateFun,
    openNodeParentId,
    openNodeId,
    doUpdateNode,
    doLockNode,
    doUnLockNode,
    onGetFolderList,
    doRunCodekNode,
  } = temporaryQuery;
  const { currentUser } = useModel("@@initialState").initialState || {};

  // 锁定节点
  const handleLockFile = () => {
    if (openNodeData?.lockAt == 0 && openNodeId) {
      doLockNode.run(openNodeId).then((res: any) => {
        if (res.code == 0) {
          onGetFolderList();
        }
      });
    }
  };

  // 解锁节点
  const handleUnLockFile = () => {
    if (isUpdateStateFun()) {
      message.warning("当前修改暂未保存，确定要解锁吗");
      return;
    }
    openNodeId &&
      doUnLockNode.run(openNodeId).then((res: any) => {
        if (res.code == 0) {
          onGetFolderList();
        }
      });
  };

  // 保存编辑后的文件节点
  const handleSaveNode = () => {
    const data: any = {
      name: openNodeData?.name,
      content: folderContent,
      desc: openNodeData?.desc,
      folderId: openNodeParentId,
    };
    openNodeId &&
      doUpdateNode.run(openNodeId, data).then((res: any) => {
        if (res.code == 0) {
          message.success("保存成功");
          onGetFolderList();
        }
      });
  };

  // run
  const handleRunCode = () => {
    openNodeData?.id &&
      doRunCodekNode.run(openNodeData?.id).then((res: any) => {
        if (res.code == 0) {
          changeSqlQueryResults(res.data);
          changeVisibleSqlQuery(true);
        }
      });
  };

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
              <Tooltip title={"锁定后可编辑"}>
                <Button
                  type={"link"}
                  onClick={() => handleLockFile()}
                  icon={<LockOutlined />}
                />
              </Tooltip>
            ) : currentUser?.id == openNodeData.lockUid ? (
              <Tooltip title={"解锁后退出编辑"}>
                <Button
                  type={"link"}
                  onClick={() => handleUnLockFile()}
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
        {isUpdateStateFun() && openNodeData?.lockUid == currentUser?.id && (
          <Tooltip title={"保存"}>
            <Button
              type={"link"}
              onClick={() => handleSaveNode()}
              icon={<SaveOutlined />}
            />
          </Tooltip>
        )}
        {/* 锁定者为自己才可以格式化 */}
        {openNodeData?.lockUid == currentUser?.id && (
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
          <Tooltip title={"运行"}>
            <Button
              type={"link"}
              onClick={() => handleRunCode()}
              icon={<PlayCircleOutlined />}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default EditorHeader;
