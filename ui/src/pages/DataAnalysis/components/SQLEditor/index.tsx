import style from "@/pages/DataAnalysis/components/SQLEditor/index.less";
import FileTitle, {
  FileTitleType,
} from "@/pages/DataAnalysis/components/FileTitle";
import EditorContent from "./EditorContent";
import { useModel } from "umi";
import SQLResult from "./SQLResult";
import { useEffect, useState } from "react";

const SQLEditor = (props: {
  file: any;
  onSave: () => void;
  onLock: (file: any) => void;
  onUnlock: (file: any) => void;
  onStop?: (file: any) => void;
  onFormat?: () => void;
  type: FileTitleType;
  onGrabLock: (file: any) => void;
  /**
   * 是否发生改变，true 为是，false 为否
   */
  isChange: boolean;
  folderContent: string;
  node: any;
  setFolderContent: (str: string) => void;
  currentPaneActiveKey: string;
}) => {
  const {
    file,
    onSave,
    onLock,
    onUnlock,
    isChange,
    onFormat,
    onGrabLock,
    folderContent,
    node,
    setFolderContent,
    currentPaneActiveKey,
  } = props;
  const [resultsList, setResultsList] = useState<any[]>([]);

  const { doResultsList, handleRunCode } = useModel("dataAnalysis");

  const handleGetResultsList = (id: number) => {
    doResultsList
      .run(id, {
        pageSize: 30,
        current: 1,
        isExcludeCrontabResult: 1,
      })
      .then((res: any) => {
        if (res.code != 0) return;
        setResultsList(res.data?.list);
      });
  };

  useEffect(() => {
    file?.id && handleGetResultsList(file.id);
  }, [file?.id]);

  return (
    <div className={style.editorMain}>
      <FileTitle
        isChange={isChange}
        file={file}
        onSave={onSave}
        onLock={onLock}
        onUnlock={onUnlock}
        onRun={() => {
          handleRunCode(file.id, handleGetResultsList);
        }}
        onFormat={onFormat}
        onGrabLock={onGrabLock}
        type={FileTitleType.sql}
        node={node}
      />
      <EditorContent
        file={file}
        folderContent={folderContent}
        setFolderContent={setFolderContent}
      />
      <SQLResult
        resultsList={resultsList}
        lockUid={file?.lockUid}
        nodeId={file?.id}
        currentPaneActiveKey={currentPaneActiveKey}
      />
    </div>
  );
};

export default SQLEditor;
