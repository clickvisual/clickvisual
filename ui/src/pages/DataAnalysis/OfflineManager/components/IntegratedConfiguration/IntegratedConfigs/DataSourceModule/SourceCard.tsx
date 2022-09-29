import {Card, Form, Input} from "antd";
import DatasourceSelect
  from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/DatasourceSelect";
import {
  DataSourceModuleProps
} from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs/DataSourceModule/index";
import {DataSourceTypeEnums} from "@/pages/DataAnalysis/OfflineManager/config";
import {useIntl} from "umi";

export interface SourceCardProps extends DataSourceModuleProps {
  file: any;
  doGetSources: any;
  doGetSqlSource: any;
  doGetSourceTable: any;
  doGetColumns: any;
  isLock: boolean;
  onSelectType?: (type: DataSourceTypeEnums) => void;
  setSource: (arr: any[]) => void;
  setMapping: (arr: any[]) => void;
  openModal: any;
  node: any;
}

const SourceCard = (props: SourceCardProps) => {
  const { isLock, setMapping, setSource, openModal, node } = props;
  const i18n = useIntl();

  const handleChangeColumns = (columns: any[], isChange?: boolean) => {
    setSource(columns);
    if (!!isChange) setMapping([]);
  };

  return (
    <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
      <Card
        size={"small"}
        title={      i18n.formatMessage({
          id: "pandas.analysis.data.source",
        })
      }
        style={{ width: "90%" }}
        headStyle={{ textAlign: "center" }}
      >
        <DatasourceSelect
          {...props}
          itemNamePath={["source"]}
          onChangeColumns={handleChangeColumns}
          openModal={openModal}
          node={node}
        />
        <Form.Item name={["source", "sourceFilter"]} label={ i18n.formatMessage({
          id: "pandas.analysis.data.filter",
        })}>
          <Input.TextArea
            disabled={isLock}
            allowClear
            autoSize={{ minRows: 3, maxRows: 3 }}
            placeholder={i18n.formatMessage({
              id: "pandas.analysis.data.filter.placeholder",
            })}
          />
        </Form.Item>
      </Card>
    </div>
  );
};
export default SourceCard;
