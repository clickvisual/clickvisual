import DataSourceModule from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule";
import { Form, FormInstance } from "antd";
import { useMemo } from "react";
import FieldMappingModule from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/FieldMappingModule";
import { useModel } from "@@/plugin-model/useModel";
import { CustomCollapseEnums } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/config";
import CustomCollapse from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/CustomCollapse";

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
    <div>
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 19 }}
        form={form}
        onFinish={(fields) => console.log("fields: ", fields)}
      >
        <CustomCollapse
          children={<DataSourceModule form={form} iid={iid} />}
          type={CustomCollapseEnums.dataSource}
        />
        <CustomCollapse
          children={
            <FieldMappingModule
              form={form}
              iid={iid}
              source={source}
              target={target}
              mapping={mapping}
              onChange={handelChangeMapping}
            />
          }
          type={CustomCollapseEnums.fieldMapping}
        />
      </Form>
    </div>
  );
};
export default IntegratedConfigs;
