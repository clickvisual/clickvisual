import sourceHeaderStyles from "@/pages/DataLogs/components/DataSourceMenu/SourceHeader/index.less";
import { Button, Tooltip } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { EditOutlined } from "@ant-design/icons";

type SourceHeaderProps = {};
const SourceHeader = (props: SourceHeaderProps) => {
  const { currentDatabase, onChangeVisibleDatabaseDraw } = useModel("dataLogs");
  const i18n = useIntl();
  return (
    <div className={sourceHeaderStyles.sourceHeaderMain}>
      <div className={sourceHeaderStyles.sourceTitle}>
        {currentDatabase ? (
          <Tooltip title={currentDatabase.databaseName}>
            <span className={sourceHeaderStyles.titleContext}>
              {currentDatabase.databaseName}
            </span>
          </Tooltip>
        ) : (
          <span>
            {i18n.formatMessage({ id: "datasource.header.databaseEmpty" })}
          </span>
        )}
      </div>
      <div className={sourceHeaderStyles.selectedBtn}>
        <Button onClick={() => onChangeVisibleDatabaseDraw(true)} type={"link"}>
          <Tooltip
            title={i18n.formatMessage({ id: "datasource.header.switch" })}
          >
            <EditOutlined />
          </Tooltip>
        </Button>
      </div>
    </div>
  );
};
export default SourceHeader;
