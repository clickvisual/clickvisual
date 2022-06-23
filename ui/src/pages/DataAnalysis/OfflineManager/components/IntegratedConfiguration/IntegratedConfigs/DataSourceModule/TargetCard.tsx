import { Card, Form, Input, Select } from "antd";
import { SourceCardProps } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/SourceCard";
import DatasourceSelect from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/DatasourceSelect";
import { PrimaryKeyConflictEnums } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/config";
import { useModel } from "@@/plugin-model/useModel";

export interface TargetCardProps extends SourceCardProps {}

const TargetCard = (props: TargetCardProps) => {
  const { setTargetColumns } = useModel("dataAnalysis", (model) => ({
    setTargetColumns: model.integratedConfigs.setTargetColumns,
  }));

  const handleChangeColumns = (columns: any[]) => {
    setTargetColumns(columns);
  };

  const PrimaryKeyConflictOptions = [
    { value: PrimaryKeyConflictEnums.insertInto, label: "insert into" },
    {
      value: PrimaryKeyConflictEnums.onDuplicateKeyUpdate,
      label: "on duplicate key update",
    },
    { value: PrimaryKeyConflictEnums.replaceInto, label: "replace into" },
  ];
  return (
    <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
      <Card
        title="数据去向"
        style={{ width: "60%" }}
        headStyle={{ textAlign: "center" }}
      >
        <DatasourceSelect
          {...props}
          itemNamePath={["target"]}
          onChangeColumns={handleChangeColumns}
        />
        <Form.Item
          name={["target", "beforeImportSQL"]}
          label={"导入前准备语句"}
        >
          <Input.TextArea
            allowClear
            autoSize={{ minRows: 4, maxRows: 4 }}
            placeholder={
              "请参考相应的 SQL 语法填写导入数据去啊边执行的 SQL 脚本"
            }
          />
        </Form.Item>
        <Form.Item name={["target", "afterImportSQL"]} label={"导入后准备语句"}>
          <Input.TextArea
            allowClear
            autoSize={{ minRows: 4, maxRows: 4 }}
            placeholder={"请参考相应的 SQL 语法填写导入数据后执行的 SQL 脚本"}
          />
        </Form.Item>
        <Form.Item name={["target", "primaryKeyConflict"]} label={"主键冲突"}>
          <Select options={PrimaryKeyConflictOptions} />
        </Form.Item>
      </Card>
    </div>
  );
};
export default TargetCard;
