import { request } from "umi";
import { ClusterType } from "@/services/systemSetting";
export interface NameSpaceType {
  configmaps: ConfigMapType[];
  namespace: string;
}

export interface ConfigMapType {
  configmapName: string;
}
export interface ConfigurationsRequest {
  k8sConfigMapName: string;
  k8sConfigMapNameSpace: string;
}

export interface ConfigurationCreatedRequest extends ConfigurationsRequest {
  configurationName: string;
  format: string;
  clusterId: number;
}

export interface ConfigurationsResponse {
  ctime: number;
  format: string;
  id: number;
  k8sConfigmapId: number;
  name: string;
  publishTime: number;
  utime: number;
}

export interface CurrentConfigurationResponse {
  content: string;
  ctime: number;
  currentEditUser: any;
  envId: number;
  format: string;
  id: number;
  k8sConfigmapId: number;
  name: string;
  ptime: number;
  utime: number;
  zoneId: number;
}

export default {
  // 获取集群下拉列表
  async getSelectedClusters() {
    return request<API.Res<ClusterType[]>>(`/api/v1/clusters`, {
      method: "GET",
    });
  },

  // 获取指定集群下的 ConfigMap
  async getSelectedConfigMaps(clusterId: number) {
    return request<API.Res<NameSpaceType[]>>(
      `/api/v1/clusters/${clusterId}/configmaps`,
      {
        method: "GET",
      }
    );
  },

  // 获取当前 k8s 配置空间下的配置列表
  async getConfigurations(params: ConfigurationsRequest) {
    return request<API.Res<ConfigurationsResponse[]>>(
      ` /api/v1/configurations`,
      {
        method: "GET",
        params,
      }
    );
  },

  // 新增配置文件
  async createdConfiguration(data: ConfigurationCreatedRequest) {
    return request<API.Res<string>>(`/api/v1/configurations`, {
      method: "POST",
      data,
    });
  },

  // 获取当前选择的配置文件
  async getConfiguration(id: number) {
    return request<API.Res<CurrentConfigurationResponse>>(
      `/api/v1/configurations/${id}`,
      { method: "GET" }
    );
  },

  // 删除配置文件
  async deletedConfiguration(id: number) {
    return request<API.Res<string>>(`/api/v1/configurations/${id}`, {
      method: "DELETE",
    });
  },

  // 增加编辑锁
  async addLock(id: number) {
    return request(`/api/v1/configurations/${id}/lock`, { method: "GET" });
  },
};
