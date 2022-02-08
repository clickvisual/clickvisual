import instanceSearchBarStyles from "@/pages/SystemSetting/InstancePanel/components/InstanceSearchBar/index.less";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useContext } from "react";
import { InstancePanelContext } from "@/pages/SystemSetting/InstancePanel";
import { useIntl } from "umi";

const InstanceSearchBar = () => {
  const i18n = useIntl();
  const { onChangeVisible } = useContext(InstancePanelContext);
  return (
    <div className={instanceSearchBarStyles.instanceSearchBarMain}>
      <Button
        onClick={() => {
          if (onChangeVisible) onChangeVisible(true);
        }}
        icon={<PlusOutlined />}
        type={"primary"}
      >
        {i18n.formatMessage({
          id: "instance.button.add",
        })}
      </Button>
    </div>
  );
};
export default InstanceSearchBar;
