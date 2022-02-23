import { useState } from "react";

const useAlarmOperations = () => {
  const [inputName, setInputName] = useState<string>();
  const [selectDid, setSelectDid] = useState<number>();
  const [selectTid, setSelectTid] = useState<number>();

  const onChangeInputName = (name: string) => {
    setInputName(name);
  };

  const onChangeSelectDid = (id: number) => {
    setSelectDid(id);
  };

  const onChangeSelectTid = (id: number | undefined) => {
    setSelectTid(id);
  };
  return {
    inputName,
    selectDid,
    selectTid,
    onChangeInputName,
    onChangeSelectDid,
    onChangeSelectTid,
  };
};
export default useAlarmOperations;
