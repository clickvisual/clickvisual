import {Card, Form, Input} from "antd";
import {
  SourceCardProps
} from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/SourceCard";
import DatasourceSelect
  from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/DatasourceSelect";
import {DataSourceTypeEnums} from "@/pages/DataAnalysis/OfflineManager/config";
import {useIntl} from "umi";

export interface TargetCardProps extends SourceCardProps {
  sourceType?: DataSourceTypeEnums;
  setTarget: (arr: any[]) => void;
  setMapping: (arr: any[]) => void;
  node: any;
}

const TargetCard = (props: TargetCardProps) => {
  const { isLock, setMapping, setTarget, node } = props;
  const i18n = useIntl();

  const handleChangeColumns = (columns: any[], isChange?: boolean) => {
    setTarget(columns);
    if (!!isChange) setMapping([]);
  };

  return (
    <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
      <Card
        size={"small"}
        title={ i18n.formatMessage({
          id: "pandas.analysis.data.target",
        })}
        style={{ width: "90%" }}
        headStyle={{ textAlign: "center" }}
      >
        <DatasourceSelect
          {...props}
          itemNamePath={["target"]}
          onChangeColumns={handleChangeColumns}
          node={node}
        />
        <Form.Item name={["target", "targetBefore"]} label={i18n.formatMessage({
          id: "pandas.analysis.data.target.before",
        })}>
          <Input.TextArea
            disabled={isLock}
            allowClear
            autoSize={{ minRows: 3, maxRows: 3 }}
            placeholder={
              i18n.formatMessage({
                id: "pandas.analysis.data.target.before.placeholder",
              })
            }
          />
        </Form.Item>
        <Form.Item name={["target", "targetAfter"]} label={i18n.formatMessage({
          id: "pandas.analysis.data.target.after",
        })}>
          <Input.TextArea
            disabled={isLock}
            allowClear
            autoSize={{ minRows: 3, maxRows: 3 }}
            placeholder={i18n.formatMessage({
              id: "pandas.analysis.data.target.after.placeholder",
            })}
          />
        </Form.Item>
      </Card>
    </div>
  );
};
export default TargetCard;
