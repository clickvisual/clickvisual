import { Button, Dropdown, Menu, Space } from "antd";
import MenuItem from "antd/es/menu/MenuItem";
import IconFont from "@/components/IconFont";
import { PaneType, QueryTypeMenuItems } from "@/models/datalogs/types";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { useMemo } from "react";

const DropdownLogMenu = ({ isShare }: { isShare: boolean }) => {
  const {
    queryTypeHelper,
    logPanesHelper,
    currentLogLibrary,
    onChangeCurrentLogPane,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;
  const { activeQueryType, setActiveQueryType } = queryTypeHelper;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const i18n = useIntl();

  const handleChangeMenu = (e: any) => {
    setActiveQueryType(e.key);
    onChangeCurrentLogPane({ ...(oldPane as PaneType), queryType: e.key });
  };

  const menu = (
    <Menu selectedKeys={[activeQueryType]}>
      {QueryTypeMenuItems.map((item) => (
        <MenuItem key={item.key} onClick={handleChangeMenu}>
          {i18n.formatMessage({ id: item.labelId })}
        </MenuItem>
      ))}
    </Menu>
  );

  if (isShare) {
    return <></>;
  }

  return (
    <Dropdown overlay={menu}>
      <Button>
        <Space>
          <span>
            {i18n.formatMessage({
              id: QueryTypeMenuItems.find(
                (item) => item.key === activeQueryType
              )?.labelId,
            })}
          </span>
          <IconFont type={"icon-switch"} />
        </Space>
      </Button>
    </Dropdown>
  );
};
export default DropdownLogMenu;
