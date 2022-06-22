import FileTitle from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/FileTitle";
import IntegratedConfigs from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs";
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
      <IntegratedConfigs form={form} file={currentNode} />
    </div>
  );
};
export default IntegratedConfiguration;
