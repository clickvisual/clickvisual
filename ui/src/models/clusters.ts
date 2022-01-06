import useRequest from "@/hooks/useRequest";
import api, { ClustersRequest, ClusterType } from "@/services/systemSetting";
import { FIRST_PAGE, PAGE_SIZE } from "@/config/config";
import { useState } from "react";

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
    loadingText: { done: "新增集群成功" },
  });
  const doUpdatedCluster = useRequest(api.updatedCluster, {
    loadingText: { done: "更新集群成功" },
  });
  const doDeletedCluster = useRequest(api.deletedCluster, {
    loadingText: { done: "删除集群成功" },
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
