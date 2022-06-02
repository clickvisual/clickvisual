import { useRef } from "react";
import { useModel } from "@@/plugin-model/useModel";

export default function useLogListScroll() {
  // 用于监听日志列表滚动
  const ref = useRef<HTMLDivElement | null>(null);
  const { onChangeHiddenHighChart, logSwitchHelper } = useModel("dataLogs");
  const { histogramChecked } = logSwitchHelper;

  const onScrollCapture = () => {
    // 如果不渲染直方图滚动就不执行计算
    if (!histogramChecked) return;
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
