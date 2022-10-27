import {
  getAlarmConfigList,
  getAlarmConfigDetails,
  patchAlarmConfigDetails,
} from "@/services/environment";
import api from "@/services/systemSetting";
import useRequest from "@/hooks/useRequest/useRequest";

const useAlarmEnvironment = () => {
  const doGetAlarmConfigList = useRequest(getAlarmConfigList, {
    loadingText: false,
  });
  const doGetAlarmConfigDetails = useRequest(getAlarmConfigDetails, {
    loadingText: false,
  });
  const doPatchAlarmConfigDetails = useRequest(patchAlarmConfigDetails, {
    loadingText: false,
  });

  const getClusterList = useRequest(api.getClusters, {
    loadingText: false,
  });

  return {
    doGetAlarmConfigList,
    doGetAlarmConfigDetails,
    doPatchAlarmConfigDetails,
    getClusterList,
  };
};
export default useAlarmEnvironment;
