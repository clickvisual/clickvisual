import notificationStyles from "@/pages/Alarm/Notifications/styles/index.less";
import { PlusOutlined } from "@ant-design/icons";
import { useModel } from "@umijs/max";
import { Button } from "antd";
import classNames from "classnames";
import { useIntl } from "umi";
const Operations = () => {
  const i18n = useIntl();
  const { alarmChannelModal } = useModel("alarm");
  const { setVisibleCreate } = alarmChannelModal;
  return (
    <div className={classNames(notificationStyles.operationMain)}>
      <Button
        onClick={() => setVisibleCreate(true)}
        icon={<PlusOutlined />}
        type="primary"
      >
        {i18n.formatMessage({ id: "alarm.notify.button.created" })}
      </Button>
    </div>
  );
};
export default Operations;
