import type { InstanceType, ClustersRequest, ClusterType } from '@/services/systemSetting';
import api from '@/services/systemSetting';
import useRequest from '@/hooks/useRequest';
import { useState } from 'react';
import type { InstanceSelectedType } from '@/services/dataLogs';
import { FIRST_PAGE, PAGE_SIZE } from '@/config/config';

const ActionsLoading = {
  CREATED: { loading: undefined, done: '新增成功' },
  UPDATED: { loading: undefined, done: '更新成功' },
  DELETED: { loading: undefined, done: '删除成功' },
};

const SystemSetting = () => {
  // 实例列表
  const [instanceList, setInstanceList] = useState<InstanceType[]>([]);
  // 当前选中实例，用于数据库筛选
  const [selectedInstance, setSelectedInstance] = useState<InstanceSelectedType | undefined>();

  // 集群列表
  const [clusterList, setClusterList] = useState<ClusterType[]>([]);

  const getInstanceList = useRequest(api.getInstances, {
    loadingText: false,
    onSuccess: (res) => setInstanceList(res.data),
  });

  const doCreatedInstance = useRequest(api.createdInstance, {
    loadingText: ActionsLoading.CREATED,
  });

  const doUpdatedInstance = useRequest(api.updatedInstance, {
    loadingText: ActionsLoading.UPDATED,
  });

  const doDeletedInstance = useRequest(api.deletedInstance, {
    loadingText: ActionsLoading.DELETED,
  });

  const getClusterList = useRequest(api.getClusters, {
    loadingText: false,
    onSuccess: (res) => setClusterList(res.data),
  });

  const doCreatedCluster = useRequest(api.createdCluster, {
    loadingText: ActionsLoading.CREATED,
  });
  const doUpdatedCluster = useRequest(api.updatedCluster, {
    loadingText: ActionsLoading.UPDATED,
  });
  const doDeletedCluster = useRequest(api.deletedCluster, {
    loadingText: ActionsLoading.DELETED,
  });

  const onChangeSelectedInstance = (instance: InstanceSelectedType | undefined) => {
    setSelectedInstance(instance);
  };

  const doGetInstanceList = () => {
    getInstanceList.run();
  };

  const doGetClustersList = (params?: ClustersRequest) => {
    getClusterList.run({ current: FIRST_PAGE, pageSize: PAGE_SIZE, ...params });
  };

  return {
    instanceList,
    clusterList,
    selectedInstance,

    doGetInstanceList,
    doCreatedInstance,
    doUpdatedInstance,
    doDeletedInstance,
    getInstanceList,

    getClusterList,
    doGetClustersList,
    doDeletedCluster,
    doCreatedCluster,
    doUpdatedCluster,

    onChangeSelectedInstance,
  };
};

export default SystemSetting;
