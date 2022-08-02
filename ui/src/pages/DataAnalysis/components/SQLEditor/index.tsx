import style from "@/pages/DataAnalysis/components/SQLEditor/index.less";
import FileTitle, {
  FileTitleType,
} from "@/pages/DataAnalysis/components/FileTitle";
import EditorContent from "./EditorContent";
import { useModel, useIntl } from "umi";
import { Empty, Spin } from "antd";
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
}) => {
  const i18n = useIntl();
  const { file, onSave, onLock, onUnlock, isChange, onFormat, onGrabLock } =
    props;
  const [resultsList, setResultsList] = useState<any[]>([]);

  const { doGetNodeInfo, manageNode, doResultsList, handleRunCode } =
    useModel("dataAnalysis");
  const { selectNode } = manageNode;

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
      <Spin spinning={doGetNodeInfo.loading || doResultsList.loading}>
        {selectNode?.id ? (
          <>
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
            />
            <EditorContent />
            <SQLResult resultsList={resultsList} nodeId={selectNode?.id} />
          </>
        ) : (
          <div className={style.empty}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={i18n.formatMessage({
                id: "bigdata.components.SQLEditor.selectFile",
              })}
            />
          </div>
        )}
      </Spin>
    </div>
  );
};

export default SQLEditor;
