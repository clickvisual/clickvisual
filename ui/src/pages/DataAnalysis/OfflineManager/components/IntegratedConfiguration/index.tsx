import FileTitle from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/FileTitle";
import IntegratedConfigs from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs";
import { Form } from "antd";
import { useEffect } from "react";
import { useModel } from "@@/plugin-model/useModel";

export interface IntegratedConfigurationProps {
  currentNode: any;
}
const IntegratedConfiguration = ({
  currentNode,
}: IntegratedConfigurationProps) => {
  const [form] = Form.useForm();
  const { setSource, setTarget, setMapping } = useModel(
    "dataAnalysis",
    (model) => ({
      setSource: model.integratedConfigs.setSourceColumns,
      setTarget: model.integratedConfigs.setTargetColumns,
      setMapping: model.integratedConfigs.setMappingData,
    })
  );

  useEffect(() => {
    form.resetFields();
    setSource([]);
    setTarget([]);
    setMapping([]);
  }, [currentNode]);
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      <FileTitle file={currentNode} />

      <div
        style={{
          height: "calc(100vh - 136px)",
          overflowY: "scroll",
          paddingBottom: "30px",
        }}
      >
        <CustomCollapse
          children={<IntegratedConfigs form={form} file={currentNode} />}
          type={CustomCollapseEnums.dataSource}
        />
        <CustomCollapse
          children={<>fieldMapping</>}
          type={CustomCollapseEnums.fieldMapping}
        />
        <CustomCollapse
          children={<>schedulingConfig</>}
          type={CustomCollapseEnums.schedulingConfig}
        />
      </div>
    </div>
  );
};
export default IntegratedConfiguration;
