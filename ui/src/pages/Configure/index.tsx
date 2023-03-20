import { DEBOUNCE_WAIT } from "@/config/config";
import Editor from "@/pages/Configure/components/Editor";
import Menu from "@/pages/Configure/components/Menu";
import MenuBar from "@/pages/Configure/components/MenuBar";
import ModalCommit from "@/pages/Configure/components/ModalCommit";
import ModalCreatedConfig from "@/pages/Configure/components/ModalCreatedConfig";
import ModalCreatedConfigMap from "@/pages/Configure/components/ModalCreatedConfigMap";
import ModalHistory from "@/pages/Configure/components/ModalHistory";
import ModalHistoryDiff from "@/pages/Configure/components/ModalHistoryDiff";
import SelectedBar from "@/pages/Configure/components/SelectedBar";
import configsStyles from "@/pages/Configure/styles/index.less";
import useUrlState from "@ahooksjs/use-url-state";
import { useModel } from "@umijs/max";
import { useDebounceFn } from "ahooks";
import { useEffect } from "react";

const Configure = () => {
  const [urlState, setUrlState] = useUrlState();
  const {
    doGetClusters,
    doSelectedClusterId,
    doSelectedNameSpace,
    doSelectedConfigMap,
    selectedConfigMap,
    selectedNameSpace,
    selectedClusterId,
    doGetConfigurations,
    onChangeConfigurations,
    currentConfiguration,
    doGetConfiguration,
  } = useModel("configure");

  const setUrlQuery = useDebounceFn(
    () => {
      setUrlState({
        cluster: selectedClusterId,
        nameSpace: selectedNameSpace,
        configmap: selectedConfigMap,
        current: currentConfiguration?.id,
      });
    },
    { wait: DEBOUNCE_WAIT }
  );

  useEffect(() => {
    doGetClusters();
    return () => {
      doSelectedClusterId(undefined);
    };
  }, []);

  useEffect(() => {
    if (selectedConfigMap && selectedNameSpace && selectedClusterId) {
      doGetConfigurations.run({
        k8sConfigMapNameSpace: selectedNameSpace,
        k8sConfigMapName: selectedConfigMap,
        clusterId: selectedClusterId,
      });
    } else {
      onChangeConfigurations([]);
    }
  }, [selectedConfigMap, selectedNameSpace, selectedClusterId]);

  useEffect(() => {
    setUrlQuery.run();
  }, [
    selectedConfigMap,
    selectedNameSpace,
    selectedClusterId,
    currentConfiguration,
  ]);

  useEffect(() => {
    try {
      if (urlState.cluster) {
        doSelectedClusterId(parseInt(urlState.cluster));
      }
      if (urlState.nameSpace && urlState.configmap) {
        doSelectedNameSpace(urlState.nameSpace);
        doSelectedConfigMap(urlState.configmap);
      }
      if (urlState.current) {
        doGetConfiguration.run(parseInt(urlState.current));
      }
    } catch (e) {
      console.log("【Error】: ", e);
    }
  }, []);

  return (
    <div className={configsStyles.configMain}>
      <SelectedBar />
      <div className={configsStyles.configManage}>
        <div className={configsStyles.menuBar}>
          <MenuBar />
        </div>
        <div className={configsStyles.optionContainer}>
          <Menu />
        </div>
        <Editor />
        <ModalCreatedConfig />
        <ModalCommit />
        <ModalHistory />
        <ModalHistoryDiff />
        <ModalCreatedConfigMap />
      </div>
    </div>
  );
};

export default Configure;
