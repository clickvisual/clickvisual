import { request } from "umi";
import { ClusterType, TimeBaseType } from "@/services/systemSetting";
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

export interface ConfigurationSyncRequest extends ConfigurationsRequest {
  clusterId: number;
}

export interface ConfigurationCreatedRequest extends ConfigurationSyncRequest {
  configurationName: string;
  format: string;
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

export interface ConfigurationUpdateRequest {
  message: string;
  content: string;
}

export interface CurrentConfigurationResponse {
  content: string;
  ctime: number;
  currentEditUser: EditorUserType | null;
  envId: number;
  format: string;
  id: number;
  k8sConfigmapId: number;
  name: string;
  ptime: number;
  utime: number;
  zoneId: number;
}

export interface PaginationRequest {
  current: number;
  pageSize: number;
}

export interface HistoryConfigurationResponse extends TimeBaseType {
  changeLog: string;
  configurationId: number;
  ctime: number;
  id: number;
  uid: number;
  username: string;
  version: string;
}
export interface EditorUserType extends TimeBaseType {
  access: string;
  avatar: string;
  currentAuthority: string;
  email: string;
  hash: string;
  id: 1;
  nickname: string;
  oa_id: number;
  oauth: string;
  oauthId: string;
  password: string;
  secret: string;
  state: string;
  username: string;
  webUrl: string;
}

export interface CreatedConfigMapRequest {
  configMapName: string;
  namespace: string;
}

export interface DiffHistoryConfigResponse {
  origin: CurrentConfigurationResponse;
  modified: CurrentConfigurationResponse;
}

export interface CurrentVersionConfigResponse extends TimeBaseType {
  changeLog: string;
  configuration: CurrentVersionConfigResponse;
  configurationId: number;
  content: string;
  id: 5;
  uid: 1;
  user: EditorUserType;
  version: string;
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

  async createdConfigMap(clusterId: number, data: CreatedConfigMapRequest) {
    return request(`/api/v1/clusters/${clusterId}/configmaps`, {
      method: "POST",
      data,
    });
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

  // 快速同步集群配置
  async synchronizingConfiguration(data: ConfigurationSyncRequest) {
    return request<API.Res<string>>(`/api/v1/configurations/0/sync`, {
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

  // 更新当前选中的配置文件
  async updatedConfiguration(id: number, data: ConfigurationUpdateRequest) {
    return request<API.Res<string>>(`/api/v1/configurations/${id}`, {
      method: "PATCH",
      data,
    });
  },

  // 删除配置文件
  async deletedConfiguration(id: number) {
    return request<API.Res<string>>(`/api/v1/configurations/${id}`, {
      method: "DELETE",
    });
  },

  // 获取配置文件历史版本
  async getHistoryConfiguration(id: number, params: PaginationRequest) {
    return request<API.ResPage<HistoryConfigurationResponse>>(
      `/api/v1/configurations/${id}/histories`,
      {
        method: "GET",
        params,
      }
    );
  },

  // 进行历史版本比对
  async diffHistoryConfiguration(id: number, historyId: number) {
    return request<API.Res<DiffHistoryConfigResponse>>(
      `/api/v1/configurations/${id}/diff`,
      {
        method: "GET",
        params: { historyId },
      }
    );
  },

  // 获取线上版本配置信息
  async getOnlineConfiguration(
    clusterId: number,
    namespace: string,
    configmapName: string,
    configurationName: string
  ) {
    return request<API.Res<string>>(
      `/api/v1/clusters/${clusterId}/namespace/${namespace}/configmaps/${configmapName}`,
      { method: "GET", params: { key: configurationName } }
    );
  },

  // 获取当前版本的配置信息
  async getCurrentVersionConfigurations(id: number, version: string) {
    return request<API.Res<CurrentVersionConfigResponse>>(
      `/api/v1/configurations/${id}/histories/${version}`,
      {
        method: "GET",
      }
    );
  },

  // 版本发布
  async publishConfiguration(configId: number, version: string) {
    return request<API.Res<string>>(
      `/api/v1/configurations/${configId}/publish`,
      {
        method: "POST",
        data: { version },
      }
    );
  },

  // 增加编辑锁
  async addLock(id: number) {
    return request<API.Res<string>>(`/api/v1/configurations/${id}/lock`, {
      method: "GET",
    });
  },

  // 移除编辑锁
  async removeLock(id: number) {
    return request<API.Res<string>>(`/api/v1/configurations/${id}/unlock`, {
      method: "POST",
    });
  },
};
