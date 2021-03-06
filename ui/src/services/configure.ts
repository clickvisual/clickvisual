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
  clusterId: number;
}

export interface ConfigurationCreatedRequest extends ConfigurationsRequest {
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
  // ????????????????????????
  async getSelectedClusters() {
    return request<API.Res<ClusterType[]>>(
      process.env.PUBLIC_PATH + `api/v1/clusters`,
      {
        method: "GET",
      }
    );
  },

  // ???????????????????????? ConfigMap
  async getSelectedConfigMaps(clusterId: number) {
    return request<API.Res<NameSpaceType[]>>(
      process.env.PUBLIC_PATH + `api/v1/clusters/${clusterId}/configmaps`,
      {
        method: "GET",
      }
    );
  },

  async createdConfigMap(clusterId: number, data: CreatedConfigMapRequest) {
    return request(
      process.env.PUBLIC_PATH + `api/v1/clusters/${clusterId}/configmaps`,
      {
        method: "POST",
        data,
      }
    );
  },

  // ???????????? k8s ??????????????????????????????
  async getConfigurations(params: ConfigurationsRequest) {
    return request<API.Res<ConfigurationsResponse[]>>(
      process.env.PUBLIC_PATH + `api/v1/configurations`,
      {
        method: "GET",
        params,
      }
    );
  },

  // ??????????????????
  async createdConfiguration(data: ConfigurationCreatedRequest) {
    return request<API.Res<string>>(
      process.env.PUBLIC_PATH + `api/v1/configurations`,
      {
        method: "POST",
        data,
      }
    );
  },

  // ????????????????????????
  async synchronizingConfiguration(data: ConfigurationsRequest) {
    return request<API.Res<string>>(
      process.env.PUBLIC_PATH + `api/v1/configurations/0/sync`,
      {
        method: "POST",
        data,
      }
    );
  },

  // ?????????????????????????????????
  async getConfiguration(id: number) {
    return request<API.Res<CurrentConfigurationResponse>>(
      process.env.PUBLIC_PATH + `api/v1/configurations/${id}`,
      { method: "GET" }
    );
  },

  // ?????????????????????????????????
  async updatedConfiguration(id: number, data: ConfigurationUpdateRequest) {
    return request<API.Res<string>>(
      process.env.PUBLIC_PATH + `api/v1/configurations/${id}`,
      {
        method: "PATCH",
        data,
      }
    );
  },

  // ??????????????????
  async deletedConfiguration(id: number) {
    return request<API.Res<string>>(
      process.env.PUBLIC_PATH + `api/v1/configurations/${id}`,
      {
        method: "DELETE",
      }
    );
  },

  // ??????????????????????????????
  async getHistoryConfiguration(id: number, params: PaginationRequest) {
    return request<API.ResPage<HistoryConfigurationResponse>>(
      process.env.PUBLIC_PATH + `api/v1/configurations/${id}/histories`,
      {
        method: "GET",
        params,
      }
    );
  },

  // ????????????????????????
  async diffHistoryConfiguration(id: number, historyId: number) {
    return request<API.Res<DiffHistoryConfigResponse>>(
      process.env.PUBLIC_PATH + `api/v1/configurations/${id}/diff`,
      {
        method: "GET",
        params: { historyId },
      }
    );
  },

  // ??????????????????????????????
  async getOnlineConfiguration(
    clusterId: number,
    namespace: string,
    configmapName: string,
    configurationName: string
  ) {
    return request<API.Res<string>>(
      process.env.PUBLIC_PATH +
        `api/v1/clusters/${clusterId}/namespace/${namespace}/configmaps/${configmapName}`,
      { method: "GET", params: { key: configurationName } }
    );
  },

  // ?????????????????????????????????
  async getCurrentVersionConfigurations(id: number, version: string) {
    return request<API.Res<CurrentVersionConfigResponse>>(
      process.env.PUBLIC_PATH +
        `api/v1/configurations/${id}/histories/${version}`,
      {
        method: "GET",
      }
    );
  },

  // ????????????
  async publishConfiguration(configId: number, version: string) {
    return request<API.Res<string>>(
      process.env.PUBLIC_PATH + `api/v1/configurations/${configId}/publish`,
      {
        method: "POST",
        data: { version },
      }
    );
  },

  // ???????????????
  async addLock(id: number) {
    return request<API.Res<string>>(
      process.env.PUBLIC_PATH + `api/v1/configurations/${id}/lock`,
      {
        method: "GET",
      }
    );
  },

  // ???????????????
  async removeLock(id: number) {
    return request<API.Res<string>>(
      process.env.PUBLIC_PATH + `api/v1/configurations/${id}/unlock`,
      {
        method: "POST",
      }
    );
  },
};
