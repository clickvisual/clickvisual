import { useState } from "react";
import useRequest from "@/hooks/useRequest/useRequest";
import api, {
  ConfigurationsResponse,
  CurrentConfigurationResponse,
  DiffHistoryConfigResponse,
  NameSpaceType,
} from "@/services/configure";
import { ClusterType } from "@/services/systemSetting";
import { message } from "antd";
import { formatMessage } from "@@/plugin-locale/localeExports";

const Configure = () => {
  // 当前选择的菜单
  const [activeMenu, setActiveMenu] = useState("files");

  // 集群下拉列表
  const [clusters, setClusters] = useState<ClusterType[]>([]);

  // k8s Config Map 下拉列表
  const [configMaps, setConfigMaps] = useState<NameSpaceType[]>([]);

  // 配置文件列表
  const [configurationList, setConfigurationList] = useState<
    ConfigurationsResponse[]
  >([]);

  // 当前选择的配置文件
  const [currentConfiguration, setCurrentConfiguration] = useState<
    CurrentConfigurationResponse | undefined
  >();
  const [configContent, setConfigContent] = useState<string>("");

  // 当前选择的集群
  const [selectedClusterId, setSelectedClusterId] = useState<
    number | undefined
  >();

  // 当前选择的 k8s Config Map NameSpace
  const [selectedNameSpace, setSelectedNameSpace] = useState<
    string | undefined
  >();

  // 当前选择的 k8s Config Map
  const [selectedConfigMap, setSelectedConfigMap] = useState<
    string | undefined
  >();

  const [diffHistory, setDiffHistory] = useState<
    DiffHistoryConfigResponse | undefined
  >();

  // 是否打开新增配置文件弹窗
  const [visibleCreate, setVisibleCreate] = useState<boolean>(false);
  // 显示保存弹窗
  const [visibleCommit, setVisibleCommit] = useState<boolean>(false);
  // 历史记录列表弹窗
  const [visibleHistory, setVisibleHistory] = useState<boolean>(false);
  // 历史版本比对弹窗
  const [visibleHistoryDiff, setVisibleHistoryDiff] = useState<boolean>(false);
  // 创建 ConfigMap 弹窗
  const [visibleCreatedConfigMap, setVisibleCreatedMap] =
    useState<boolean>(false);

  const doGetClusters = useRequest(api.getSelectedClusters, {
    loadingText: false,
    onError: undefined,
    onSuccess: (res) => setClusters(res.data),
  }).run;

  const doGetConfigMaps = useRequest(api.getSelectedConfigMaps, {
    loadingText: false,
    onError: undefined,
    onSuccess: (res) => setConfigMaps(res.data),
  }).run;

  const doGetConfigurations = useRequest(api.getConfigurations, {
    loadingText: false,
    onSuccess: (res) => setConfigurationList(res.data),
  });

  const doCreatedConfigMap = useRequest(api.createdConfigMap, {
    loadingText: false,
    onSuccess() {
      message.success(
        formatMessage({ id: "config.configMap.success.created" })
      );
    },
  });

  const doCreatedConfiguration = useRequest(api.createdConfiguration, {
    loadingText: false,
    onSuccess() {
      message.success(formatMessage({ id: "config.file.success.created" }));
    },
  });

  const doDeletedConfigurations = useRequest(api.deletedConfiguration, {
    loadingText: false,
    onSuccess() {
      message.success(formatMessage({ id: "config.file.success.deleted" }));
    },
  }).run;

  const doUpdatedConfiguration = useRequest(api.updatedConfiguration, {
    loadingText: false,
    onSuccess() {
      message.success(formatMessage({ id: "config.file.success.updated" }));
    },
  });

  const doGetConfiguration = useRequest(api.getConfiguration, {
    loadingText: false,
    onSuccess: (res) => {
      setCurrentConfiguration(res.data);
      setConfigContent(res.data.content);
    },
  });

  const doGetHistoryConfiguration = useRequest(api.getHistoryConfiguration, {
    loadingText: false,
  });

  const doGetCurrentVersionConfiguration = useRequest(
    api.getCurrentVersionConfigurations,
    {
      loadingText: false,
    }
  );

  const doGetOnlineConfiguration = useRequest(api.getOnlineConfiguration, {
    loadingText: false,
  });

  const doPublishConfiguration = useRequest(api.publishConfiguration, {
    loadingText: false,
    onSuccess() {
      message.success(formatMessage({ id: "config.file.success.publish" }));
    },
  });

  const doAddLock = useRequest(api.addLock, {
    loadingText: false,
    onSuccess: (res) => {
      if (currentConfiguration) {
        doGetConfiguration.run(currentConfiguration.id);
      }
    },
  });

  const doDiffHistoryConfiguration = useRequest(api.diffHistoryConfiguration, {
    loadingText: false,
    onSuccess: (res) => setDiffHistory(res.data),
  });

  const doRemoveLock = useRequest(api.removeLock, {
    loadingText: false,
    onSuccess: (res) => {
      if (currentConfiguration) {
        doGetConfiguration.run(currentConfiguration.id);
      }
    },
  });

  const doSynchronizingConfiguration = useRequest(
    api.synchronizingConfiguration,
    {
      loadingText: false,
    }
  );

  const doSelectedMenu = (key: string) => {
    setActiveMenu(key);
  };

  const doSelectedClusterId = (id: number | undefined) => {
    setSelectedClusterId(id);
  };

  const doSelectedNameSpace = (namespace: string | undefined) => {
    setSelectedNameSpace(namespace);
  };
  const doSelectedConfigMap = (namespace: string | undefined) => {
    setSelectedConfigMap(namespace);
  };

  const onChangeConfigMaps = (configMap: NameSpaceType[]) => {
    setConfigMaps(configMap);
  };

  const onChangeConfigurations = (configurations: any[]) => {
    setConfigurationList(configurations);
  };

  const onChangeVisibleCreate = (visible: boolean) => {
    setVisibleCreate(visible);
  };

  const onChangeVisibleCommit = (visible: boolean) => {
    setVisibleCommit(visible);
  };

  const onChangeVisibleHistory = (visible: boolean) => {
    setVisibleHistory(visible);
  };

  const onChangeVisibleHistoryDiff = (visible: boolean) => {
    setVisibleHistoryDiff(visible);
  };

  const onChangeVisibleCreatedConfigMap = (visible: boolean) => {
    setVisibleCreatedMap(visible);
  };

  const onChangeCurrentConfiguration = (configuration: any | undefined) => {
    setCurrentConfiguration(configuration);
  };

  const onChangeConfigContent = (context: string) => {
    setConfigContent(context);
  };

  const onChangeDiffHistory = (diff: any | undefined) => {
    setDiffHistory(diff);
  };

  return {
    clusters,
    configMaps,
    configurationList,
    selectedClusterId,
    selectedNameSpace,
    selectedConfigMap,
    activeMenu,
    currentConfiguration,
    configContent,
    diffHistory,

    visibleCreate,
    visibleCommit,
    visibleHistory,
    visibleHistoryDiff,
    visibleCreatedConfigMap,

    doGetClusters,
    doGetConfigMaps,
    doGetConfigurations,
    doCreatedConfiguration,
    doDeletedConfigurations,
    doUpdatedConfiguration,
    doGetConfiguration,
    doGetHistoryConfiguration,
    doDiffHistoryConfiguration,
    doGetCurrentVersionConfiguration,
    onChangeVisibleCreatedConfigMap,
    doCreatedConfigMap,
    doAddLock,
    doRemoveLock,
    doPublishConfiguration,
    doGetOnlineConfiguration,
    doSynchronizingConfiguration,

    onChangeConfigMaps,
    onChangeConfigurations,
    onChangeVisibleCreate,
    onChangeVisibleCommit,
    onChangeVisibleHistory,
    onChangeVisibleHistoryDiff,
    onChangeCurrentConfiguration,
    onChangeConfigContent,
    onChangeDiffHistory,

    doSelectedMenu,
    doSelectedClusterId,
    doSelectedNameSpace,
    doSelectedConfigMap,
  };
};

export default Configure;
