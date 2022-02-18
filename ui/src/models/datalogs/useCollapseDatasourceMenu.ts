import { useState } from "react";

const useCollapseDatasourceMenu = () => {
  const [foldingState, setFoldingState] = useState<boolean>(false);

  const onChangeFoldingState = (state: boolean) => {
    setFoldingState(state);
  };
  return {
    foldingState,
    onChangeFoldingState,
  };
};
export default useCollapseDatasourceMenu;
