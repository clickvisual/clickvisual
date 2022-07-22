import { Button, Empty, FormInstance, Space } from "antd";
import ButterflyDataMapping from "react-data-mapping";
import "react-data-mapping/dist/index.css";
import { useCallback, useMemo } from "react";
import "./index.less";
import { ArrayLengthComparison } from "@/utils/ArrayLengthComparison";

export interface FieldMappingModule {
  form: FormInstance<any>;
  iid: number;
  source: any[];
  target: any[];
  mapping: any[];
  onChange: (data: any) => void;
  isLock: boolean;
}
const FieldMappingModule = ({
  source,
  target,
  mapping,
  onChange,
  isLock,
  form,
}: FieldMappingModule) => {
  const columns = [
    {
      key: "field",
      width: 170,
      primaryKey: true,
    },
    {
      key: "type",
      width: 180,
    },
  ];
  const sourceData = useMemo(() => {
    if (!form.getFieldValue(["source", "table"]) || source?.length == 0) {
      return [];
    }

    return [
      {
        id: "source",
        title: "Source",
        disable: false,
        fields: source?.map((item) => ({
          id: item.field,
          disable: false,
          field: item.field,
          type: item.type,
        })),
      },
    ];
  }, [source]);

  const targetData = useMemo(() => {
    if (!form.getFieldValue(["target", "table"]) || target?.length == 0) {
      return [];
    }
    return [
      {
        id: "target",
        title: "Target",
        disable: false,
        fields: target?.map((item) => ({
          id: item.field,
          disable: false,
          field: item.field,
          type: item.type,
        })),
      },
    ];
  }, [target]);

  const resetMapping = useCallback(() => {
    onChange({ mappingData: [] });
  }, []);

  const peerMapping = useCallback(() => {
    const targetFields = targetData[0].fields;
    const sourceFields = sourceData[0].fields;
    const arrObj: {
      same: boolean;
      max?: any[];
      min?: any[];
    } | null = ArrayLengthComparison(sourceFields, targetFields);
    if (!arrObj) return;
    const mappingData = [];
    if (arrObj.same) {
      for (const index in sourceFields) {
        mappingData.push({
          source: sourceFields[index].id,
          sourceNode: "source",
          target: targetFields[index].id,
          targetNode: "target",
        });
      }
    }

    if (arrObj.min?.length === sourceFields.length) {
      for (const index in sourceFields) {
        mappingData.push({
          source: sourceFields[index].id,
          sourceNode: "source",
          target: targetFields[index].id,
          targetNode: "target",
        });
      }
    } else {
      for (const index in targetFields) {
        mappingData.push({
          source: sourceFields[index].id,
          sourceNode: "source",
          target: targetFields[index].id,
          targetNode: "target",
        });
      }
    }
    onChange({
      targetData,
      sourceData,
      mappingData,
    });
  }, [targetData, sourceData]);

  const sameNameMapping = useCallback(() => {
    const targetFields = targetData[0].fields;
    const sourceFields = sourceData[0].fields;
    const mappingData = [];

    for (const index in targetFields) {
      const source = sourceFields.find(
        (item) => item.id === targetFields[index].id
      );
      if (source) {
        mappingData.push({
          source: source.id,
          sourceNode: "source",
          target: targetFields[index].id,
          targetNode: "target",
        });
      }
    }
    onChange({
      targetData,
      sourceData,
      mappingData,
    });
  }, [targetData, sourceData]);

  if (
    (sourceData?.length <= 0 && targetData?.length <= 0) ||
    !form.getFieldValue(["target", "table"]) ||
    !form.getFieldValue(["source", "table"])
  ) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }
  return (
    <div
      style={{
        padding: "0 20px",
      }}
    >
      {source?.length > 0 && target?.length > 0 && (
        <>
          <div
            style={{
              marginBottom: "10px",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <Space>
              <Button
                type={"primary"}
                disabled={isLock}
                onClick={sameNameMapping}
              >
                同名映射
              </Button>
              <Button type={"primary"} disabled={isLock} onClick={peerMapping}>
                同行映射
              </Button>
              <Button type={"primary"} disabled={isLock} onClick={resetMapping}>
                取消映射
              </Button>
            </Space>
          </div>
          <ButterflyDataMapping
            width={"auto"}
            height={"auto"}
            type={"mutiply"}
            columns={columns}
            sourceData={sourceData}
            targetData={targetData}
            mappingData={mapping}
            config={{
              linkNumLimit: 1,
              paddingCenter: 100,
            }}
            className={"butterfly-data-mappint mapping"}
            sourceClassName={"source-column"}
            targetClassName={"target-column"}
            onChange={onChange}
            readonly={isLock}
            onCheckChange={() => {}}
            onLoaded={() => {}}
            sourceColumns={columns}
            targetColumns={columns}
          />
        </>
      )}
    </div>
  );
};
export default FieldMappingModule;
