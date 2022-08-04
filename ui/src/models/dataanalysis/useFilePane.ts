import { useState } from "react";

export interface PaneItemType {
  key: string;
  title: string;
  parentId: number;
  node: any;
}

const useFilePane = () => {
  /**
   * 临时查询
   */
  // pane列表
  const [paneList, setPaneList] = useState<PaneItemType[]>([]);
  // 当前选中paneKey
  const [currentPaneActiveKey, setCurrentPaneActiveKey] = useState<string>("");

  /**
   * 数据开发
   */
  // pane列表
  const [offlinePaneList, setOfflinePaneList] = useState<PaneItemType[]>([]);
  // 当前选中paneKey
  const [currentOfflinePaneActiveKey, setCurrentOfflinePaneActiveKey] =
    useState<string>("");

  const onChangePaneList = (arr: PaneItemType[]) => {
    setPaneList(arr);
  };

  const onChangeCurrentPaneActiveKey = (str: string) => {
    setCurrentPaneActiveKey(str);
  };

  const onChangeOfflinePaneList = (arr: PaneItemType[]) => {
    setOfflinePaneList(arr);
  };

  const onChangeCurrentOfflinePaneActiveKey = (str: string) => {
    setCurrentOfflinePaneActiveKey(str);
  };

  return {
    paneList,
    onChangePaneList,

    currentPaneActiveKey,
    onChangeCurrentPaneActiveKey,

    offlinePaneList,
    onChangeOfflinePaneList,

    currentOfflinePaneActiveKey,
    onChangeCurrentOfflinePaneActiveKey,
  };
};
export default useFilePane;
