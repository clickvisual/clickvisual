import classNames from "classnames";
import dataLogsStyles from "@/pages/DataLogs/styles/index.less";
import { CaretLeftOutlined, CaretRightOutlined } from "@ant-design/icons";
import { useModel } from "@@/plugin-model/useModel";
import { useDebounceFn } from "ahooks";
import { useEffect } from "react";

const CollapseMenu = () => {
  const { foldingState, onChangeFoldingState } = useModel("dataLogs");
  useEffect(() => {
    const isFold = localStorage.getItem("isFold") === "true";
    if (isFold) onChangeFoldingState(true);
  }, []);

  const onClickBtn = useDebounceFn(
    () => {
      const flag = !foldingState;
      onChangeFoldingState(flag);
      localStorage.setItem("isFold", `${flag}`);
    },
    { wait: 500 }
  ).run;

  return (
    <div
      onClick={onClickBtn}
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
