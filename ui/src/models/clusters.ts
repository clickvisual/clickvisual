import useRequest from "@/hooks/useRequest/useRequest";
import api, { ClustersRequest, ClusterType } from "@/services/systemSetting";
import { FIRST_PAGE, PAGE_SIZE } from "@/config/config";
import { useState } from "react";
import { message } from "antd";
import { formatMessage } from "@@/plugin-locale/localeExports";

const Clusters = () => {
  const [clusterList, setClusterList] = useState<ClusterType[]>([]);

  const [configCurrentCluster, setConfigCurrentCluster] = useState<
    ClusterType | undefined
  >();
  const getClusterList = useRequest(api.getClusters, {
    loadingText: false,
    onSuccess: (res) => setClusterList(res.data),
  });

  const doCreatedCluster = useRequest(api.createdCluster, {
    loadingText: false,
    onSuccess() {
      message.success(formatMessage({ id: "cluster.success.created" }));
    },
  });
  const doUpdatedCluster = useRequest(api.updatedCluster, {
    loadingText: false,
    onSuccess() {
      message.success(formatMessage({ id: "cluster.success.updated" }));
    },
  });
  const doDeletedCluster = useRequest(api.deletedCluster, {
    loadingText: false,
    onSuccess() {
      message.success(formatMessage({ id: "cluster.success.deleted" }));
    },
  });

  const doGetClustersList = (params?: ClustersRequest) => {
    getClusterList.run({ current: FIRST_PAGE, pageSize: PAGE_SIZE, ...params });
  };

  const doSelectedConfigCurrentCluster = (cluster: ClusterType | undefined) => {
    setConfigCurrentCluster(cluster);
  };

  return {
    clusterList,
    getClusterList,
    doGetClustersList,
    doDeletedCluster,
    doCreatedCluster,
    doUpdatedCluster,
    configCurrentCluster,
    doSelectedConfigCurrentCluster,
    pagination: getClusterList.pagination,
    listLoading: getClusterList.loading,
  };
};

export default Clusters;
