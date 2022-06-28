import DataSourceModule from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule";
import { Form, FormInstance } from "antd";
import FieldMappingModule from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/FieldMappingModule";
import { useModel } from "@@/plugin-model/useModel";
import { CustomCollapseEnums } from "@/pages/DataAnalysis/OfflineManager/config";
import CustomCollapse from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/CustomCollapse";
import { useMemo } from "react";

export interface IntegratedConfigsProps {
  file: any;
  iid: number;
  form: FormInstance<any>;
  onSubmit: (field: any) => void;
  onFormChange: (changedValues?: any, allValues?: any) => void;
}

const IntegratedConfigs = ({
  file,
  iid,
  form,
  onSubmit,
  onFormChange,
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
  const { currentUser } = useModel("@@initialState").initialState || {};
  const isLock = useMemo(
    () =>
      !file.lockUid || file?.lockUid === 0 || file?.lockUid !== currentUser?.id,
    [currentUser?.id, file.lockUid]
  );

  const handelChangeMapping = (data: any) => {
    console.log("data: ", data);
    onFormChange();

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
        isLock={isLock}
        onChange={handelChangeMapping}
      />
    );
  }, [source, target, mapping, form, iid, isLock]);

  return (
    <div
      style={{
        height: "100%",
        overflowY: "scroll",
        paddingBottom: "30px",
      }}
    >
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 19 }}
        size={"small"}
        form={form}
        onFinish={onSubmit}
        onValuesChange={onFormChange}
      >
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
