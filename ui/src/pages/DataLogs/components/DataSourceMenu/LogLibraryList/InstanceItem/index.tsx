import IconFont from "@/components/IconFont";
import logLibraryListStyles from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/index.less";
import { PlusSquareOutlined } from "@ant-design/icons";
import { Dropdown, Tooltip } from "antd";
import { useIntl, useModel } from "umi";

const InstanceItem = (props: { instanceItem: any }) => {
  const {
    onChangeCreatedDatabaseModal,
    onChangeCreateDatabaseCurrentInstance,
  } = useModel("database");
  const {
    onChangeIsAccessLogLibrary,
    onChangeLogLibraryCreatedModalVisible,
    onChangeIsLogLibraryAllDatabase,
    resizeMenuWidth,
  } = useModel("dataLogs");
  const { instanceItem } = props;
  const i18n = useIntl();

  const tooltipTitle = (
    <div>
      <div className={logLibraryListStyles.logTipTitle}>
        <span>
          {i18n.formatMessage({ id: "instance.name" })}:&nbsp;
          {instanceItem.instanceName}
        </span>
      </div>
      <div>
        <div className={logLibraryListStyles.logTipTitle}>
          {i18n.formatMessage({ id: "descAsAlias" })}
          :&nbsp; {!instanceItem?.desc ? "" : instanceItem.desc}
        </div>
      </div>
    </div>
  );

  const menuList = [
    {
      label: i18n.formatMessage({ id: "global.database.add" }),
      key: "database-create",
      onClick: () => {
        onChangeCreatedDatabaseModal(true);
        onChangeCreateDatabaseCurrentInstance(instanceItem.id);
      },
      icon: (
        <PlusSquareOutlined style={{ color: "#000", marginRight: "8px" }} />
      ),
    },
    {
      label: i18n.formatMessage({ id: "datasource.draw.logLibraryButton" }),
      key: "loglibrary-Access",
      onClick: () => {
        onChangeIsAccessLogLibrary(true);
        onChangeLogLibraryCreatedModalVisible(true);
        onChangeIsLogLibraryAllDatabase(true);
      },
      icon: <IconFont type={"icon-addLogLibrary"} />,
    },
  ];

  let nameDesc = instanceItem.instanceName;
  if (instanceItem.desc) {
    // 只取desc前7个字符
    nameDesc += " (" + instanceItem.desc.substring(0, 7) + ")";
  }
  return (
    <Dropdown menu={{ items: menuList }} trigger={["contextMenu"]}>
      <Tooltip
        title={tooltipTitle}
        placement="right"
        overlayClassName={logLibraryListStyles.logLibraryToolTip}
        overlayInnerStyle={{ width: 300 }}
      >
        <div
          style={{
            width: resizeMenuWidth - 45 + "px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <IconFont type="icon-instance" style={{ marginRight: "4px" }} />
          {nameDesc}
        </div>
      </Tooltip>
    </Dropdown>
  );
};
export default InstanceItem;
