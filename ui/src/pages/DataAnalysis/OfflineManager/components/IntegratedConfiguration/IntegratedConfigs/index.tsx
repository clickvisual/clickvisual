import DataSourceModule from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule";
import { Button, Form, FormInstance } from "antd";
import { useMemo } from "react";
import FieldMappingModule from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/FieldMappingModule";
import { useModel } from "@@/plugin-model/useModel";

export interface IntegratedConfigsProps {
  file: any;
  form: FormInstance<any>;
}

const IntegratedConfigs = ({ file, form }: IntegratedConfigsProps) => {
  const { source, target, mapping, setMapping } = useModel(
    "dataAnalysis",
    (model) => ({
      source: model.integratedConfigs.sourceColumns,
      target: model.integratedConfigs.targetColumns,
      mapping: model.integratedConfigs.mappingData,
      setMapping: model.integratedConfigs.setMappingData,
    })
  );

  const handelChangeMapping = (data: any) => {
    console.log(data.mappingData);
    setMapping(data.mappingData);
  };

  const iid = useMemo(() => file.iid, [file.iid]);

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 19 }}
        form={form}
        onFinish={(fields) => console.log("fields: ", fields)}
      >
        <DataSourceModule form={form} iid={iid} />
        <FieldMappingModule
          form={form}
          iid={iid}
          source={source}
          target={target}
          mapping={mapping}
          onChange={handelChangeMapping}
        />
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
