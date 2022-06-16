import { useState } from "react";

const useCollapseDatasourceMenu = () => {
  const [foldingState, setFoldingState] = useState<boolean>(
    localStorage.getItem("isFold") === "true"
  );
  const [resizeMenuWidth, setResizeMenuWidth] = useState<number>(
    parseInt(localStorage.getItem("app-left-menu-width") || "200") || 200
  );

  const onChangeFoldingState = (state: boolean) => {
    localStorage.setItem("isFold", `${state}`);
    setFoldingState(state);
  };

  const onChangeResizeMenuWidth = (width: number) => {
    localStorage.setItem("app-left-menu-width", `${width}`);
    setResizeMenuWidth(width);
  };
  return {
    foldingState,
    onChangeFoldingState,
    resizeMenuWidth,
    onChangeResizeMenuWidth,
  };
};
export default useCollapseDatasourceMenu;
