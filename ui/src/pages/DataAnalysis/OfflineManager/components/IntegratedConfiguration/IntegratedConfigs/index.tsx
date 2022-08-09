import DataSourceModule from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule";
import { Form, FormInstance } from "antd";
import FieldMappingModule from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/FieldMappingModule";
import { useModel } from "@@/plugin-model/useModel";
import { CustomCollapseEnums } from "@/pages/DataAnalysis/OfflineManager/config";
import CustomCollapse from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/CustomCollapse";
import { useMemo } from "react";
import { isEqual } from "lodash";
import { OpenTypeEnums } from "@/models/dataanalysis/useIntegratedConfigs";

export interface IntegratedConfigsProps {
  file: any;
  iid: number;
  form: FormInstance<any>;
  onSubmit: (field: any) => void;
  onFormChange: (changedValues?: any, allValues?: any) => void;
  node: any;
  source: any;
  setSource: (arr: any[]) => void;
  target: any;
  setTarget: (arr: any[]) => void;
  mapping: any;
  setMapping: (arr: any[]) => void;
  defaultMappingData: any;
  openVisible: any;
  setOpenVisible: (val: boolean) => void;
  openType: any;
  setOpenType: (val: OpenTypeEnums | undefined) => void;
  tableName: any;
  setTableName: (val: string | undefined) => void;
  currentPaneActiveKey: string;
}

const IntegratedConfigs = ({
  file,
  iid,
  form,
  onSubmit,
  onFormChange,
  node,
  source,
  setSource,
  target,
  setTarget,
  mapping,
  setMapping,
  defaultMappingData,

  openVisible,
  setOpenVisible,
  openType,
  setOpenType,
  tableName,
  setTableName,
  currentPaneActiveKey,
}: IntegratedConfigsProps) => {
  const { currentUser } = useModel("@@initialState").initialState || {};
  const isLock = useMemo(
    () =>
      !file.lockUid || file?.lockUid === 0 || file?.lockUid !== currentUser?.id,
    [currentUser?.id, file.lockUid]
  );

  const handelChangeMapping = (data: any) => {
    const { mappingData, sourceData, targetData } = data;
    const result: any[] = [];
    mappingData.forEach((item: any) => {
      const sourceType = sourceData
        .find((source: any) => source.id === item.sourceNode)
        ?.fields.find((field: any) => field.id === item.source)?.type;
      const targetType = targetData
        .find((target: any) => target.id === item.targetNode)
        ?.fields.find((field: any) => field.id === item.target)?.type;
      result.push({
        ...item,
        sourceType,
        targetType,
      });
    });
    // 接口返回的值和修改后的值是否全等
    !isEqual(defaultMappingData, result) && onFormChange();
    setMapping(result);
  };

  return (
    <div
      style={{
        height: "calc(100% - 32px)",
        overflowY: "scroll",
        paddingBottom: "30px",
      }}
    >
      <Form
        labelCol={{
          span: 5,
        }}
        wrapperCol={{ span: 19 }}
        size={"small"}
        form={form}
        onFinish={onSubmit}
        onValuesChange={onFormChange}
      >
        <CustomCollapse
          children={
            <DataSourceModule
              file={file}
              form={form}
              iid={iid}
              setSource={setSource}
              setTarget={setTarget}
              setMapping={setMapping}
              source={source}
              target={target}
              openVisible={openVisible}
              setOpenVisible={setOpenVisible}
              openType={openType}
              setOpenType={setOpenType}
              tableName={tableName}
              setTableName={setTableName}
              node={node}
            />
          }
          type={CustomCollapseEnums.dataSource}
        />
        <CustomCollapse
          children={
            <FieldMappingModule
              form={form}
              iid={iid}
              source={source}
              target={target}
              mapping={
                mapping.length > 0
                  ? mapping.map((item: any) => ({
                      ...item,
                      sourceNode: "source",
                      targetNode: "target",
                    }))
                  : []
              }
              isLock={isLock}
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
