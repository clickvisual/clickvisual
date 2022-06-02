import { useState } from "react";

const useLogSwitch = () => {
  const [histogramChecked, setHistogramChecked] = useState<boolean>(true);

  const handleChangeHistogramChecked = (flag: boolean) => {
    setHistogramChecked(flag);
  };

  return {
    histogramChecked,
    handleChangeHistogramChecked,
  };
};

export default useLogSwitch;
