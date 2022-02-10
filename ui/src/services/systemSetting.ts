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

export interface CreatedDatabaseRequest {
  databaseName: string;
}

export default {
  // Getting a list of instances
  async getInstances() {
    return request<API.Res<InstanceType[]>>(`/api/v1/sys/instances`, {
      method: "GET",
    });
  },
  // Create an instance
  async createdInstance(data: InstanceType) {
    return request<API.Res<string>>(`/api/v1/sys/instances`, {
      method: "POST",
      data,
    });
  },
  // Update instance
  async updatedInstance(id: number, data: InstanceType) {
    return request<API.Res<string>>(`/api/v1/sys/instances/${id}`, {
      method: "PATCH",
      data,
    });
  },
  // Deleting an instance
  async deletedInstance(id: number) {
    return request<API.Res<string>>(`/api/v1/sys/instances/${id}`, {
      method: "DELETE",
    });
  },

  // Obtaining the cluster List
  async getClusters(params?: ClustersRequest) {
    return request<API.ResPage<ClusterType>>(`/api/v1/sys/clusters`, {
      method: "GET",
      params,
    });
  },
  // Creating a Cluster
  async createdCluster(data: ClusterType) {
    return request<API.Res<string>>(`/api/v1/sys/clusters`, {
      method: "POST",
      data,
    });
  },
  // Updating a cluster
  async updatedCluster(id: number, data: ClusterType) {
    return request<API.Res<string>>(`/api/v1/sys/clusters/${id}`, {
      method: "PATCH",
      data,
    });
  },
  // Deleting a Cluster
  async deletedCluster(id: number) {
    return request<API.Res<string>>(`/api/v1/sys/clusters/${id}`, {
      method: "DELETE",
    });
  },

  // Creating a database
  async createdDatabase(iid: number, data: CreatedDatabaseRequest) {
    return request(`api/v1/instances/${iid}/databases`, {
      method: "POST",
      data,
    });
  },
};
