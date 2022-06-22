import DataSourceModule from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule";
import { Button, Form, FormInstance } from "antd";
import { useMemo } from "react";
import FieldMappingModule from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/FieldMappingModule";

export interface IntegratedConfigsProps {
  file: any;
  form: FormInstance<any>;
}

const IntegratedConfigs = ({ file, form }: IntegratedConfigsProps) => {
  const iid = useMemo(() => file.iid, [file.iid]);
  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 19 }}
        form={form}
        onFinish={(fields) => console.log("fields: ", fields)}
      >
        <DataSourceModule form={form} iid={iid} />
        <FieldMappingModule form={form} iid={iid} />
        <Form.Item>
          <Button htmlType={"submit"} type={"primary"}>
            提交
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};
export default IntegratedConfigs;
