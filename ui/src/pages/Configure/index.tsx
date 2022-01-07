import configsStyles from "@/pages/Configure/styles/index.less";
import MenuBar from "@/pages/Configure/components/MenuBar";
import Menu from "@/pages/Configure/components/Menu";
import Editor from "@/pages/Configure/components/Editor";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import SelectedBar from "@/pages/Configure/components/SelectedBar";
import ModalCreatedConfig from "@/pages/Configure/components/ModalCreatedConfig";

type ConfigureProps = {};
const Configure = (props: ConfigureProps) => {
  const { doGetClusters, doSelectedClusterId } = useModel("configure");

  useEffect(() => {
    doGetClusters();
    return () => {
      doSelectedClusterId(undefined);
    };
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
      </div>
    </div>
  );
};

export default Configure;
