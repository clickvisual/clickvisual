import { useMemo, useRef } from "react";
import { useModel } from "@@/plugin-model/useModel";

export default function useLogListScroll() {
  // 用于监听日志列表滚动
  const ref = useRef<HTMLDivElement | null>(null);
  const { currentLogLibrary, onChangeHiddenHighChart, logPanesHelper } =
    useModel("dataLogs");
  const { logPanes } = logPanesHelper;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const onScrollCapture = () => {
    // 如果不渲染直方图滚动就不执行计算
    if (!oldPane?.histogramChecked) return;
    if (ref.current) {
      if (ref.current.scrollTop < 50) {
        onChangeHiddenHighChart(false);
      } else if (ref.current.scrollTop > 300) {
        onChangeHiddenHighChart(true);
      }
    } else {
      onChangeHiddenHighChart(true);
    }
  };

  return {
    onScrollCapture,
    ref,
  };
}
