import { useState } from "react";

const useAlarmFormDraw = () => {
  const [visibleDraw, setVisibleDraw] = useState<boolean>(false);
  const onChangeVisibleDraw = (visible: boolean) => {
    setVisibleDraw(visible);
  };

  return {
    visibleDraw,
    onChangeVisibleDraw,
  };
};
export default useAlarmFormDraw;
