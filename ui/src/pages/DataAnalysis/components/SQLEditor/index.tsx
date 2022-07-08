import style from "@/pages/DataAnalysis/components/SQLEditor/index.less";
import FileTitle, {
  FileTitleProps,
  FileTitleType,
} from "@/pages/DataAnalysis/components/FileTitle";
import EditorContent from "./EditorContent";
import SqlTable from "./SqlTable";
import { useModel } from "umi";
import { Empty, Spin } from "antd";

const SQLEditor = (props: FileTitleProps) => {
  const { file, onSave, onLock, onUnlock, onRun, isChange, onFormat } = props;

  const { doGetNodeInfo, manageNode } = useModel("dataAnalysis");

  const { selectNode } = manageNode;

  return (
    <div className={style.editorMain}>
      <Spin spinning={doGetNodeInfo.loading}>
        {selectNode?.id ? (
          <>
            <FileTitle
              isChange={isChange}
              file={file}
              onSave={onSave}
              onLock={onLock}
              onUnlock={onUnlock}
              onRun={onRun}
              onFormat={onFormat}
              type={FileTitleType.sql}
            />
            <EditorContent />
          </>
        ) : (
          <div className={style.empty}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="请选择文件"
            />
          </div>
        )}
      </Spin>
      <SqlTable />
    </div>
  );
};

export default SQLEditor;
