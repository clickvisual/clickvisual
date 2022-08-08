import { Dropdown, Menu, Tooltip } from "antd";
import { useIntl, useModel } from "umi";
import logLibraryListStyles from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/index.less";
import MenuItem from "antd/lib/menu/MenuItem";
import { PlusSquareOutlined } from "@ant-design/icons";

const InstanceItem = (props: { instanceItem: any }) => {
  const {
    onChangeCreatedDatabaseModal,
    onChangeCreateDatabaseCurrentInstance,
  } = useModel("database");
  const { instanceItem } = props;
  const i18n = useIntl();

  const tooltipTitle = (
    <div>
      <div className={logLibraryListStyles.logTipTitle}>
        <span>
          {i18n.formatMessage({ id: "instance.instanceName" })}:&nbsp;
          {instanceItem.instanceName}
        </span>
      </div>
      <div>
        <div className={logLibraryListStyles.logTipTitle}>
          {i18n.formatMessage({ id: "DescAsAlias" })}
          :&nbsp; {!instanceItem?.desc ? "" : instanceItem.desc}
        </div>
      </div>
    </div>
  );

  const menu = (
    <Menu>
      <MenuItem
        icon={
          <PlusSquareOutlined style={{ color: "#000", marginRight: "3px" }} />
        }
        onClick={() => {
          onChangeCreatedDatabaseModal(true);
          onChangeCreateDatabaseCurrentInstance(instanceItem.id);
        }}
      >
        {i18n.formatMessage({ id: "instance.operation.addDatabase" })}
      </MenuItem>
    </Menu>
  );

  return (
    <Dropdown overlay={menu} trigger={["contextMenu"]}>
      <Tooltip
        title={tooltipTitle}
        placement="right"
        overlayClassName={logLibraryListStyles.logLibraryToolTip}
        overlayInnerStyle={{ width: 300 }}
      >
        <div style={{ width: "100%" }}>{instanceItem.instanceName}</div>
      </Tooltip>
    </Dropdown>
  );
};
export default InstanceItem;
