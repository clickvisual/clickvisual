import CustomModal from "@/components/CustomModal";
import { useModel } from "@umijs/max";
import { useEffect } from "react";
import { MonacoDiffEditor } from "react-monaco-editor";
import { useIntl } from "umi";

const ModalHistoryDiff = () => {
  const {
    currentConfiguration,
    visibleHistoryDiff,
    onChangeVisibleHistoryDiff,
    diffHistory,
    onChangeDiffHistory,
  } = useModel("configure");
  const i18n = useIntl();

  useEffect(() => {
    if (!visibleHistoryDiff) {
      onChangeDiffHistory(undefined);
    }
  }, [visibleHistoryDiff]);

  return (
    <CustomModal
      title={i18n.formatMessage({ id: "config.historyDiff.title" })}
      width={"90vw"}
      open={visibleHistoryDiff}
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
