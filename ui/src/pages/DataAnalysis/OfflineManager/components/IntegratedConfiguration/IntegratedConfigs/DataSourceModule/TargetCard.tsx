import { Card, Form, Input } from "antd";
import { SourceCardProps } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/SourceCard";
import DatasourceSelect from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/DatasourceSelect";
import { DataSourceTypeEnums } from "@/pages/DataAnalysis/OfflineManager/config";
import { useIntl } from "umi";
import { MinusCircleOutlined, PlusCircleOutlined } from "@ant-design/icons";

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
        title={i18n.formatMessage({
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
        <Form.List name={["target", "targetBeforeList"]} initialValue={[""]}>
          {(fields, { add, remove }) => {
            return (
              <Form.Item
                label={i18n.formatMessage({
                  id: "pandas.analysis.data.target.before",
                })}
              >
                {fields.map((field) => {
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <Form.Item key={field.key} name={[field.name]} noStyle>
                        <Input.TextArea
                          disabled={isLock}
                          allowClear
                          autoSize={{ minRows: 3, maxRows: 3 }}
                          placeholder={i18n.formatMessage({
                            id: "pandas.analysis.data.target.before.placeholder",
                          })}
                        />
                      </Form.Item>
                      <div style={{ width: "40px" }}>
                        <PlusCircleOutlined
                          style={{ margin: "10px" }}
                          onClick={() => add()}
                        />
                        {fields.length > 1 && (
                          <MinusCircleOutlined
                            style={{ margin: "10px" }}
                            onClick={() => remove(field.name)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </Form.Item>
            );
          }}
        </Form.List>
        <Form.List name={["target", "targetAfterList"]} initialValue={[""]}>
          {(fields, { add, remove }) => {
            return (
              <Form.Item
                label={i18n.formatMessage({
                  id: "pandas.analysis.data.target.after",
                })}
              >
                {fields.map((field) => {
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <Form.Item key={field.key} name={[field.name]} noStyle>
                        <Input.TextArea
                          disabled={isLock}
                          allowClear
                          autoSize={{ minRows: 3, maxRows: 3 }}
                          placeholder={i18n.formatMessage({
                            id: "pandas.analysis.data.target.after.placeholder",
                          })}
                        />
                      </Form.Item>
                      <div style={{ width: "40px" }}>
                        <PlusCircleOutlined
                          style={{ margin: "10px" }}
                          onClick={() => add()}
                        />
                        {fields.length > 1 && (
                          <MinusCircleOutlined
                            style={{ margin: "10px" }}
                            onClick={() => remove(field.name)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </Form.Item>
            );
          }}
        </Form.List>
      </Card>
    </div>
  );
};
export default TargetCard;
