import configsStyles from "@/pages/Configure/styles/index.less";
import MenuBar from "@/pages/Configure/components/MenuBar";
import Menu from "@/pages/Configure/components/Menu";
import Editor from "@/pages/Configure/components/Editor";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import SelectedBar from "@/pages/Configure/components/SelectedBar";
import ModalCreatedConfig from "@/pages/Configure/components/ModalCreatedConfig";
import ModalCommit from "@/pages/Configure/components/ModalCommit";
import ModalHistory from "@/pages/Configure/components/ModalHistory";
import ModalHistoryDiff from "@/pages/Configure/components/ModalHistoryDiff";
import ModalCreatedConfigMap from "@/pages/Configure/components/ModalCreatedConfigMap";
import useUrlState from "@ahooksjs/use-url-state";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";

type ConfigureProps = {};
const Configure = (props: ConfigureProps) => {
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
        configMap: selectedConfigMap,
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
    if (selectedConfigMap && selectedNameSpace) {
      doGetConfigurations.run({
        k8sConfigMapNameSpace: selectedNameSpace,
        k8sConfigMapName: selectedConfigMap,
      });
    } else {
      onChangeConfigurations([]);
    }
  }, [selectedConfigMap, selectedNameSpace]);

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
      if (urlState.nameSpace && urlState.configMap) {
        doSelectedNameSpace(urlState.nameSpace);
        doSelectedConfigMap(urlState.configMap);
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
