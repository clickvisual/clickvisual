import FileTitle from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/FileTitle";
import IntegratedConfigs from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs";
import CustomCollapse from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/CustomCollapse";
import { CustomCollapseEnums } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/config";
import { Form } from "antd";

export interface IntegratedConfigurationProps {
  currentNode: any;
}
const IntegratedConfiguration = ({
  currentNode,
}: IntegratedConfigurationProps) => {
  const [form] = Form.useForm();
  return (
    <div style={{ height: "100vh" }}>
      <FileTitle file={currentNode} />
      <CustomCollapse
        children={<IntegratedConfigs form={form} file={currentNode} />}
        type={CustomCollapseEnums.dataSource}
      />
    </div>
  );
};
export default IntegratedConfiguration;
