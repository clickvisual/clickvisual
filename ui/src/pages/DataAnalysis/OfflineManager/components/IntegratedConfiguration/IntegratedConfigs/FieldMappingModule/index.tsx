import { FormInstance } from "antd";
// @ts-ignore
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
}
const FieldMappingModule = ({
  iid,
  form,
  source,
  target,
  mapping,
  onChange,
}: FieldMappingModule) => {
  const columns = [
    {
      key: "field",
      width: 200,
    },
    {
      key: "type",
      width: 200,
    },
  ];
  const sourceData = useMemo(() => {
    return [
      {
        id: "source",
        title: "Source",
        disable: false,
        fields: source.map((item) => ({
          id: item.field,
          disable: false,
          field: item.field,
          type: item.type,
        })),
      },
    ];
  }, [source]);

  const targetData = useMemo(() => {
    return [
      {
        id: "target",
        title: "Target",
        disable: false,
        fields: target.map((item) => ({
          id: item.field,
          disable: false,
          field: item.field,
          type: item.type,
        })),
      },
    ];
  }, [target]);

  return (
    <>
      {source.length > 0 && target.length > 0 && (
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
        />
      )}
    </>
  );
};
export default FieldMappingModule;
