import DataSourceModule from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule";
import { Form, FormInstance } from "antd";
import FieldMappingModule from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/FieldMappingModule";
import { useModel } from "@@/plugin-model/useModel";
import { CustomCollapseEnums } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/config";
import CustomCollapse from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/CustomCollapse";
import { useMemo } from "react";

export interface IntegratedConfigsProps {
  file: any;
  iid: number;
  form: FormInstance<any>;
  onSubmit: (field: any) => void;
}

const IntegratedConfigs = ({
  file,
  iid,
  form,
  onSubmit,
}: IntegratedConfigsProps) => {
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
    console.log("data: ", data);

    // todo: sourceNode、targetNode 为废弃参数，需要拼接 sourceType、targetType
    setMapping(data.mappingData);
  };

  const FieldMapping = useMemo(() => {
    return (
      <FieldMappingModule
        form={form}
        iid={iid}
        source={source}
        target={target}
        mapping={mapping}
        onChange={handelChangeMapping}
      />
    );
  }, [source, target, mapping, form, iid]);

  return (
    <div
      style={{
        height: "calc(100vh - 136px)",
        overflowY: "scroll",
        paddingBottom: "30px",
      }}
    >
      <Form layout={"vertical"} form={form} onFinish={onSubmit}>
        <CustomCollapse
          children={<DataSourceModule file={file} form={form} iid={iid} />}
          type={CustomCollapseEnums.dataSource}
        />
        <CustomCollapse
          children={FieldMapping}
          type={CustomCollapseEnums.fieldMapping}
        />
      </Form>
    </div>
  );
};
export default IntegratedConfigs;
