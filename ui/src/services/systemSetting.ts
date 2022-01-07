import { request } from "umi";
export interface TimeBaseType {
  utime?: number;
  ctime?: number;
  dtime?: number;
}
export interface InstanceType extends TimeBaseType {
  id?: number;
  datasource: string;
  dsn: string;
  instanceName: string;
}

export interface ClustersRequest {
  current?: number;
  pageSize?: number;
  query?: string;
}

export interface ClusterType extends TimeBaseType {
  id?: number;
  clusterName: string;
  apiServer: string;
  description: string;
  kubeConfig: string;
  status: number;
}

export default {
  // 获取实例列表
  async getInstances() {
    return request<API.Res<InstanceType[]>>(`/api/v1/sys/instances`, {
      method: "GET",
    });
  },
  // 新增实例
  async createdInstance(data: InstanceType) {
    return request<API.Res<string>>(`/api/v1/sys/instances`, {
      method: "POST",
      data,
    });
  },
  // 更新实例
  async updatedInstance(id: number, data: InstanceType) {
    return request<API.Res<string>>(`/api/v1/sys/instances/${id}`, {
      method: "PATCH",
      data,
    });
  },
  // 删除实例
  async deletedInstance(id: number) {
    return request<API.Res<string>>(`/api/v1/sys/instances/${id}`, {
      method: "DELETE",
    });
  },

  // 获取集群列表
  async getClusters(params?: ClustersRequest) {
    return request<API.ResPage<ClusterType>>(`/api/v1/sys/clusters`, {
      method: "GET",
      params,
    });
  },
  // 新增集群
  async createdCluster(data: ClusterType) {
    return request<API.Res<string>>(`/api/v1/sys/clusters`, {
      method: "POST",
      data,
    });
  },
  // 更新集群
  async updatedCluster(id: number, data: ClusterType) {
    return request<API.Res<string>>(`/api/v1/sys/clusters/${id}`, {
      method: "PATCH",
      data,
    });
  },
  // 删除集群
  async deletedCluster(id: number) {
    return request<API.Res<string>>(`/api/v1/sys/clusters/${id}`, {
      method: "DELETE",
    });
  },
};
