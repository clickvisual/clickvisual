import { useState } from "react";
import useRequest from "@/hooks/useRequest/useRequest";
import api from "@/services/dataLogs";

const useLogOptions = () => {
  const [visibleHideField, setVisibleHideField] = useState<boolean>(false);

  const getHideFields = useRequest(api.getHideFields, { loadingText: false });

  const updateFields = useRequest(api.updateHideFields, { loadingText: false });
  return {
    visibleHideField,
    setVisibleHideField,

    getHideFields,
    updateFields,
  };
};

export default useLogOptions;
