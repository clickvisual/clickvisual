import notificationStyles from "@/pages/Alarm/Notifications/styles/index.less";
import classNames from "classnames";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useIntl } from "umi";
const Operations = () => {
  const i18n = useIntl();
  return (
    <div className={classNames(notificationStyles.operationMain)}>
      <Button icon={<PlusOutlined />} type="primary">
        {i18n.formatMessage({ id: "alarm.notice.button.created" })}
      </Button>
    </div>
  );
};
export default Operations;
