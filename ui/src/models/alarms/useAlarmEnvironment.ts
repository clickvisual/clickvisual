import {
  getAlarmConfigList,
  getAlarmConfigDetails,
  patchAlarmConfigDetails,
  createMetricsSamplesTable,
} from "@/services/environment";
import api from "@/services/systemSetting";
import useRequest from "@/hooks/useRequest/useRequest";
import apiConfigure from "@/services/configure";

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

  const doGetConfigMaps = useRequest(apiConfigure.getSelectedConfigMaps, {
    loadingText: false,
  });

  const doGetInstanceList = useRequest(api.getInstances, {
    loadingText: false,
  });

  const doCreateMetricsSamplesTable = useRequest(createMetricsSamplesTable, {
    loadingText: false,
  });

  return {
    doGetAlarmConfigList,
    doGetAlarmConfigDetails,
    doPatchAlarmConfigDetails,
    doCreateMetricsSamplesTable,
    getClusterList,
    doGetConfigMaps,
    doGetInstanceList,
  };
};
export default useAlarmEnvironment;
