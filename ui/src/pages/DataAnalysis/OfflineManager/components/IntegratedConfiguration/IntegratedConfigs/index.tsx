import DataSourceModule from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule";
import { Button, Form, FormInstance } from "antd";
import { useMemo } from "react";

export interface IntegratedConfigsProps {
  file: any;
  form: FormInstance<any>;
}

const IntegratedConfigs = ({ file, form }: IntegratedConfigsProps) => {
  const iid = useMemo(() => file.iid, [file.iid]);
  return (
    <>
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 19 }}
        form={form}
        onFinish={(fields) => console.log("fields: ", fields)}
      >
        <DataSourceModule form={form} iid={iid} />
        <Form.Item>
          <Button htmlType={"submit"} type={"primary"}>
            提交
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};
export default IntegratedConfigs;
