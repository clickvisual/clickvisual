import CustomModal from "@/components/CustomModal";
import { MonacoDiffEditor } from "react-monaco-editor";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";

const ModalHistoryDiff = () => {
  const {
    currentConfiguration,
    visibleHistoryDiff,
    onChangeVisibleHistoryDiff,
    diffHistory,
    onChangeDiffHistory,
  } = useModel("configure");

  useEffect(() => {
    if (!visibleHistoryDiff) {
      onChangeDiffHistory(undefined);
    }
  }, [visibleHistoryDiff]);

  return (
    <CustomModal
      title={"历史版本比对"}
      width={"90vw"}
      visible={visibleHistoryDiff}
      onCancel={() => onChangeVisibleHistoryDiff(false)}
    >
      <MonacoDiffEditor
        language={currentConfiguration?.format === "json" ? "json" : "sb"}
        theme="vs-dark"
        original={diffHistory?.origin?.content || ""}
        value={diffHistory?.modified?.content || ""}
        height="80vh"
        options={{ automaticLayout: true, scrollBeyondLastLine: false }}
      />
    </CustomModal>
  );
};

export default ModalHistoryDiff;
