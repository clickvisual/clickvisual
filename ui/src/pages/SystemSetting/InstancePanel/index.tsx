import instancePanelStyles from "@/pages/SystemSetting/InstancePanel/styles/index.less";
import InstanceSearchBar from "@/pages/SystemSetting/InstancePanel/components/InstanceSearchBar";
import InstanceTable from "@/pages/SystemSetting/InstancePanel/components/InstanceTable";
import { useModel } from "@@/plugin-model/useModel";
import React, { useEffect, useState } from "react";
import CreatedOrUpdatedInstanceModal from "@/pages/SystemSetting/InstancePanel/components/CreatedOrUpdatedInstanceModal";
import type { InstanceType } from "@/services/systemSetting";

type InstancePanelContextType = {
  onChangeVisible?: (flag: boolean) => void;
  onChangeIsEditor?: (flag: boolean) => void;
  onChangeCurrentInstance?: (param: InstanceType | undefined) => void;
};
export const InstancePanelContext =
  React.createContext<InstancePanelContextType>({});
const InstancePanel = () => {
  const { doGetInstanceList, instanceList } = useModel("instances");
  const [list, setList] = useState<any[]>([]);
  const [instanceFormVisible, setInstanceFormVisible] = useState<true | false>(
    false
  );
  const [isEditorInstanceForm, setIsEditorInstanceForm] = useState<
    true | false
  >(false);
  const [currentInstance, setCurrentInstance] = useState<
    InstanceType | undefined
  >();
  useEffect(() => {
    doGetInstanceList();
  }, []);

  useEffect(() => {
    setList(instanceList);
  }, [instanceList]);

  return (
    <div className={instancePanelStyles.instancePanelMain}>
      <InstancePanelContext.Provider
        value={{
          onChangeVisible: (flag: boolean) => setInstanceFormVisible(flag),
          onChangeIsEditor: (flag: boolean) => setIsEditorInstanceForm(flag),
          onChangeCurrentInstance: (param: InstanceType | undefined) =>
            setCurrentInstance(param),
        }}
      >
        <InstanceSearchBar />
        <InstanceTable list={list} />
      </InstancePanelContext.Provider>
      <CreatedOrUpdatedInstanceModal
        visible={instanceFormVisible}
        isEditor={isEditorInstanceForm}
        current={currentInstance}
        onCancel={() => {
          setInstanceFormVisible(false);
          setIsEditorInstanceForm(false);
          setCurrentInstance(undefined);
        }}
      />
    </div>
  );
};
export default InstancePanel;
