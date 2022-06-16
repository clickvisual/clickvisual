import classNames from "classnames";
import dataLogsStyles from "@/pages/DataLogs/styles/index.less";
import { CaretLeftOutlined, CaretRightOutlined } from "@ant-design/icons";
import { useModel } from "@@/plugin-model/useModel";
import { useDebounceFn } from "ahooks";

const CollapseMenu = () => {
  const { foldingState, resizeMenuWidth, onChangeFoldingState } = useModel(
    "dataLogs",
    (model) => ({
      foldingState: model.foldingState,
      resizeMenuWidth: model.resizeMenuWidth,
      onChangeFoldingState: model.onChangeFoldingState,
    })
  );

  const onClickBtn = useDebounceFn(
    () => {
      const flag = !foldingState;
      onChangeFoldingState(flag);
    },
    { wait: 500 }
  ).run;

  return (
    <div
      onClick={onClickBtn}
      style={{
        left: !foldingState ? `${resizeMenuWidth + 10}px` : undefined,
      }}
      className={classNames(
        dataLogsStyles.menuBtn,
        !foldingState && dataLogsStyles.menuBtnCollapsed
      )}
    >
      {foldingState ? <CaretRightOutlined /> : <CaretLeftOutlined />}
    </div>
  );
};

export default CollapseMenu;
