import { Empty, FormInstance } from "antd";
import ButterflyDataMapping from "react-data-mapping";
import "react-data-mapping/dist/index.css";
import { useMemo } from "react";
import "./index.less";

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
      width: 150,
      primaryKey: true,
    },
    {
      key: "type",
      width: 150,
    },
  ];
  const sourceData = useMemo(() => {
    if (!form.getFieldValue(["source", "table"])) {
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
    if (!form.getFieldValue(["target", "table"])) {
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

  if (
    !form.getFieldValue(["target", "table"]) ||
    !form.getFieldValue(["source", "table"])
  ) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  if (sourceData?.length <= 0 && targetData?.length <= 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }
  return (
    <div style={{ padding: "0 20px" }}>
      {source?.length > 0 && target?.length > 0 && (
        <ButterflyDataMapping
          width={"auto"}
          height={"auto"}
          type={"mutiply"}
          columns={columns}
          sourceData={sourceData}
          targetData={targetData}
          mappingData={mapping}
          config={{
            delayDraw: 300,
            linkNumLimit: 1,
          }}
          className={"butterfly-data-mappint test"}
          sourceClassName={"source-column"}
          targetClassName={"target-column"}
          onChange={onChange}
          readonly={isLock}
        />
      )}
    </div>
  );
};
export default FieldMappingModule;
