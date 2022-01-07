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

type ConfigureProps = {};
const Configure = (props: ConfigureProps) => {
  const {
    doGetClusters,
    doSelectedClusterId,
    selectedConfigMap,
    selectedNameSpace,
    doGetConfigurations,
    onChangeConfigurations,
  } = useModel("configure");

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
