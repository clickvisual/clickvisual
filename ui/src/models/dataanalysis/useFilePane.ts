import { useState } from "react";

export interface PaneItemType {
  key: string;
  title: string;
  parentId: number;
  node: any;
}

const useFilePane = () => {
  // pane列表
  const [paneList, setPaneList] = useState<PaneItemType[]>([]);
  // 当前选中paneKey
  const [currentPaneActiveKey, setCurrentPaneActiveKey] = useState<string>("");

  const onChangePaneList = (arr: PaneItemType[]) => {
    setPaneList(arr);
  };

  const onChangeCurrentPaneActiveKey = (str: string) => {
    setCurrentPaneActiveKey(str);
  };

  return {
    paneList,
    onChangePaneList,

    currentPaneActiveKey,
    onChangeCurrentPaneActiveKey,
  };
};
export default useFilePane;
