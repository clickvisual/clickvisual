import { useEffect, useState } from "react";
import {
  ACTIVE_TIME_INDEX,
  FIFTEEN_TIME,
  FIRST_PAGE,
  MINUTES_UNIT_TIME,
  PAGE_SIZE,
  TimeRangeType,
} from "@/config/config";
import { currentTimeStamp } from "@/utils/momentUtils";
import moment from "moment";
import { PaneType } from "@/models/datalogs/types";

export const DefaultPane = {
  start: moment().subtract(FIFTEEN_TIME, MINUTES_UNIT_TIME).unix(),
  end: currentTimeStamp(),
  page: FIRST_PAGE,
  pageSize: PAGE_SIZE,
  keyword: undefined,
  activeIndex: ACTIVE_TIME_INDEX,
  activeTabKey: TimeRangeType.Relative,
  highCharts: undefined,
  logs: undefined,
  histogramChecked: true,
  foldingChecked: true,
};

const useLogPanes = () => {
  // 日志 Tab 标签
  const [logPanes, setLogPanes] = useState<{ [Key: string]: PaneType }>({});
  const [paneKeys, setPaneKeys] = useState<string[]>([]);

  const removeLogPane = (key: string) => {
    const currentPanes = { ...logPanes };
    delete currentPanes[key];
    setLogPanes(currentPanes);
    setPaneKeys((paneKeys) => paneKeys.filter((item) => item !== key));
  };

  const addLogPane = (key: string, pane: PaneType) => {
    if (!paneKeys.includes(pane.paneId)) {
      setPaneKeys((paneKeys) => [...paneKeys, key]);
    }
    const panes = { ...logPanes };
    const paneFoldFlag = localStorage.getItem(`fold-log-flag${pane.paneId}`);
    if (!!paneFoldFlag) {
      pane.foldingChecked = JSON.parse(paneFoldFlag).foldingChecked;
    }
    panes[key] = { ...DefaultPane, ...pane };
    setLogPanes(panes);
  };

  const updateLogPane = (
    key: string,
    newPane: PaneType,
    oldPanes?: { [Key: string]: PaneType }
  ) => {
    const panes = { ...(oldPanes ?? logPanes) };
    panes[key] = newPane;
    if (newPane.paneId) {
      localStorage.setItem(
        `fold-log-flag${newPane.paneId}`,
        JSON.stringify({
          paneId: newPane.paneId,
          foldingChecked: newPane.foldingChecked,
        })
      );
    }
    setLogPanes(panes);
  };

  const resetPane = () => {
    setLogPanes({});
    setPaneKeys([]);
  };

  useEffect(() => {}, [logPanes]);

  return {
    logPanes,
    paneKeys,
    addLogPane,
    removeLogPane,
    updateLogPane,
    resetPane,
  };
};
export default useLogPanes;
