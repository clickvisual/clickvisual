import dataLogsStyles from "@/pages/DataLogs/styles/index.less";
import { CaretLeftOutlined, CaretRightOutlined } from "@ant-design/icons";
import { useModel } from "@umijs/max";
import { useDebounceFn } from "ahooks";
import classNames from "classnames";

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
        left: !foldingState ? `${resizeMenuWidth - 2}px` : undefined,
        borderRadius: !foldingState
          ? "100% 0 0 100%  / 50%"
          : "0 100% 100% 0 / 50%",
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
