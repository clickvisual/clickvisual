import { Card, Form, Input } from "antd";
import DatasourceSelect from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/DatasourceSelect";
import { DataSourceModuleProps } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/index";
import { useModel } from "@@/plugin-model/useModel";

export interface SourceCardProps extends DataSourceModuleProps {
  doGetSources: any;
  doGetSqlSource: any;
  doGetSourceTable: any;
  doGetColumns: any;
}

const SourceCard = (props: SourceCardProps) => {
  const { setSourceColumns } = useModel("dataAnalysis", (model) => ({
    setSourceColumns: model.integratedConfigs.setSourceColumns,
  }));

  const handleChangeColumns = (columns: any[]) => {
    setSourceColumns(columns);
  };

  return (
    <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
      <Card
        title="数据来源"
        style={{ width: "90%" }}
        headStyle={{ textAlign: "center" }}
      >
        <DatasourceSelect
          {...props}
          itemNamePath={["source"]}
          onChangeColumns={handleChangeColumns}
        />
        <Form.Item name={["source", "querySql"]} label={"数据过滤"}>
          <Input.TextArea
            allowClear
            autoSize={{ minRows: 4, maxRows: 4 }}
            placeholder={"请参考相应的 SQL 语法填写过滤条件"}
          />
        </Form.Item>
      </Card>
    </div>
  );
};
export default SourceCard;
