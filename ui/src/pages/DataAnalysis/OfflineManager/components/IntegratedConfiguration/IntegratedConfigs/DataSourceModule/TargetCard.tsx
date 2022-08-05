import { Card, Form, Input } from "antd";
import { SourceCardProps } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/SourceCard";
import DatasourceSelect from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/DatasourceSelect";
import { DataSourceTypeEnums } from "@/pages/DataAnalysis/OfflineManager/config";

export interface TargetCardProps extends SourceCardProps {
  sourceType?: DataSourceTypeEnums;
  setTarget: (arr: any[]) => void;
  setMapping: (arr: any[]) => void;
  node: any;
}

const TargetCard = (props: TargetCardProps) => {
  const { isLock, setMapping, setTarget, node } = props;

  const handleChangeColumns = (columns: any[], isChange?: boolean) => {
    setTarget(columns);
    if (!!isChange) setMapping([]);
  };

  return (
    <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
      <Card
        size={"small"}
        title="数据去向"
        style={{ width: "90%" }}
        headStyle={{ textAlign: "center" }}
      >
        <DatasourceSelect
          {...props}
          itemNamePath={["target"]}
          onChangeColumns={handleChangeColumns}
          node={node}
        />
        <Form.Item name={["target", "targetBefore"]} label={"导入前语句"}>
          <Input.TextArea
            disabled={isLock}
            allowClear
            autoSize={{ minRows: 3, maxRows: 3 }}
            placeholder={
              "请参考相应的 SQL 语法填写导入数据去啊边执行的 SQL 脚本"
            }
          />
        </Form.Item>
        <Form.Item name={["target", "targetAfter"]} label={"导入后语句"}>
          <Input.TextArea
            disabled={isLock}
            allowClear
            autoSize={{ minRows: 3, maxRows: 3 }}
            placeholder={"请参考相应的 SQL 语法填写导入数据后执行的 SQL 脚本"}
          />
        </Form.Item>
      </Card>
    </div>
  );
};
export default TargetCard;
