import deletedModal from "@/components/DeletedModal";
import IconFont from "@/components/IconFont";
import logLibraryListStyles from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/index.less";
import { PlusSquareOutlined } from "@ant-design/icons";
import { Dropdown, Menu, message, Tooltip } from "antd";
import MenuItem from "antd/es/menu/MenuItem";
import { useIntl, useModel } from "umi";

const DatabaseItem = (props: { databasesItem: any; onGetList: any }) => {
  const { databasesItem, onGetList } = props;
  const i18n = useIntl();
  const {
    // currentDatabase,
    // onChangeCurrentDatabase,
    // doGetDatabaseList,
    onChangeLogLibraryCreatedModalVisible,
    onChangeAddLogToDatabase,
    onChangeIsEditDatabase,
    onChangeCurrentEditDatabase,
  } = useModel("dataLogs");
  const { deletedDatabase } = useModel("database");

  const doDeletedDatabase = (record: any) => {
    deletedModal({
      content: i18n.formatMessage(
        { id: "datasource.deleted.content" },
        { database: record.databaseName }
      ),
      onOk: () => {
        const hideMessage = message.loading(
          {
            content: i18n.formatMessage(
              { id: "datasource.deleted.loading" },
              { database: record.databaseName }
            ),
            key: "database",
          },
          0
        );
        deletedDatabase
          .run(record.id)
          .then((res) => {
            if (res?.code !== 0) {
              hideMessage();
              return;
            }
            onGetList();
            // if (currentDatabase?.id === record.id) {
            //   onChangeCurrentDatabase(undefined);
            // }
            // doGetDatabaseList(selectedInstance);
            message.success(
              {
                content: i18n.formatMessage(
                  { id: "datasource.deleted.success" },
                  { database: record.databaseName }
                ),
                key: "database",
              },
              3
            );
          })
          .catch(() => hideMessage());
      },
    });
  };

  const menu = (
    <Menu>
      <MenuItem
        icon={
          <IconFont style={{ color: "#000" }} type={"icon-database-edit"} />
        }
        onClick={() => {
          onChangeIsEditDatabase(true);
          onChangeCurrentEditDatabase(databasesItem);
        }}
      >
        {i18n.formatMessage({ id: "datasource.draw.table.edit.tip" })}
      </MenuItem>
      <MenuItem
        icon={<PlusSquareOutlined style={{ color: "#000" }} />}
        onClick={() => {
          onChangeAddLogToDatabase(databasesItem);
          onChangeLogLibraryCreatedModalVisible(true);
        }}
      >
        {i18n.formatMessage({
          id: "datasource.draw.table.operation.tip",
        })}
      </MenuItem>
      <MenuItem
        icon={<IconFont type={"icon-delete"} />}
        onClick={() => {
          doDeletedDatabase(databasesItem);
        }}
      >
        <span style={{ color: "#de6464" }}>
          {i18n.formatMessage({ id: "datasource.draw.table.delete.tip" })}
        </span>
      </MenuItem>
    </Menu>
  );

  const tooltipTitle = (
    <div>
      <div className={logLibraryListStyles.logTipTitle}>
        <span>
          {i18n.formatMessage({ id: "database.form.label.name" })}: &nbsp;
          {databasesItem.databaseName}
        </span>
      </div>
      <div>
        <div className={logLibraryListStyles.logTipTitle}>
          {i18n.formatMessage({ id: "DescAsAlias" })}
          :&nbsp; {!databasesItem?.desc ? "" : databasesItem.desc}
        </div>
      </div>
      <div>
        <div className={logLibraryListStyles.logTipTitle}>
          {i18n.formatMessage({
            id: "log.editLogLibraryModal.label.isCreateCV.name",
          })}
          :&nbsp; {Boolean(databasesItem.isCreateByCV).toString()}
        </div>
      </div>
      <div>
        <div className={logLibraryListStyles.logTipTitle}>
          {i18n.formatMessage({
            id: "instance.form.title.cluster",
          })}
          :&nbsp;{Boolean(databasesItem.cluster)}
        </div>
      </div>
    </div>
  );

  return (
    <Dropdown overlay={menu} trigger={["contextMenu"]}>
      <Tooltip
        title={tooltipTitle}
        placement="right"
        overlayClassName={logLibraryListStyles.logLibraryToolTip}
        overlayInnerStyle={{ width: 300 }}
      >
        <div style={{ width: "100%" }}>
          <IconFont type="icon-database" style={{ marginRight: "4px" }} />
          {databasesItem.databaseName}
        </div>
      </Tooltip>
    </Dropdown>
  );
};
export default DatabaseItem;
