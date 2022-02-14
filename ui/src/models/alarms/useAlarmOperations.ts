import { useState } from "react";

const useAlarmOperations = () => {
  const [selectDid, setSelectDid] = useState<number>();
  const [selectTid, setSelectTid] = useState<number>();

  const onChangeSelectDid = (id: number) => {
    setSelectDid(id);
  };

  const onChangeSelectTid = (id: number) => {
    setSelectTid(id);
  };
  return {
    selectDid,
    selectTid,
    onChangeSelectDid,
    onChangeSelectTid,
  };
};
export default useAlarmOperations;
