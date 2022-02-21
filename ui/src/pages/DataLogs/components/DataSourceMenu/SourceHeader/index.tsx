import sourceHeaderStyles from "@/pages/DataLogs/components/DataSourceMenu/SourceHeader/index.less";
import { Button, Tooltip } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { AppstoreOutlined } from "@ant-design/icons";

type SourceHeaderProps = {};
const SourceHeader = (props: SourceHeaderProps) => {
  const { currentDatabase, onChangeVisibleDatabaseDraw } = useModel("dataLogs");
  const i18n = useIntl();
  return (
    <div className={sourceHeaderStyles.sourceHeaderMain}>
      <div className={sourceHeaderStyles.sourceTitle}>
        {currentDatabase ? (
          <Tooltip title={currentDatabase.name}>
            <span className={sourceHeaderStyles.titleContext}>
              {currentDatabase.name}
            </span>
          </Tooltip>
        ) : (
          <span>
            {i18n.formatMessage({ id: "datasource.header.databaseEmpty" })}
          </span>
        )}
      </div>
      <div className={sourceHeaderStyles.selectedBtn}>
        <Button
          onClick={() => onChangeVisibleDatabaseDraw(true)}
          type={"link"}
          icon={
            <Tooltip
              title={i18n.formatMessage({ id: "datasource.header.switch" })}
            >
              <AppstoreOutlined />
            </Tooltip>
          }
        />
      </div>
    </div>
  );
};
export default SourceHeader;
