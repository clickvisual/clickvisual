import { useEffect, useState } from "react";
import useRequest from "@/hooks/useRequest";
import api, {
  ConfigurationsResponse,
  NameSpaceType,
} from "@/services/configure";
import { ClusterType } from "@/services/systemSetting";

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
    any | undefined
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

  // 是否打开新增配置文件弹窗
  const [visibleCreate, setVisibleCreate] = useState<boolean>(false);

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

  const doCreatedConfiguration = useRequest(api.createdConfiguration, {
    loadingText: { done: "新增配置成功" },
  });

  const doDeletedConfigurations = useRequest(api.deletedConfiguration, {
    loadingText: { done: "删除配置成功" },
  }).run;

  const doGetConfiguration = useRequest(api.getConfiguration, {
    loadingText: false,
    onSuccess: (res) => {
      setCurrentConfiguration(res.data);
      setConfigContent(res.data.content);
    },
  });

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

  const onChangeCurrentConfiguration = (configuration: any | undefined) => {
    setCurrentConfiguration(configuration);
  };

  const onChangeConfigContent = (context: string) => {
    setConfigContent(context);
  };

  useEffect(() => {
    onChangeCurrentConfiguration(undefined);
    onChangeConfigContent("");
  }, [selectedClusterId, selectedNameSpace, selectedConfigMap, activeMenu]);

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

    visibleCreate,

    doGetClusters,
    doGetConfigMaps,
    doGetConfigurations,
    doCreatedConfiguration,
    doDeletedConfigurations,
    doGetConfiguration,

    onChangeConfigMaps,
    onChangeConfigurations,
    onChangeVisibleCreate,
    onChangeCurrentConfiguration,
    onChangeConfigContent,

    doSelectedMenu,
    doSelectedClusterId,
    doSelectedNameSpace,
    doSelectedConfigMap,
  };
};

export default Configure;
