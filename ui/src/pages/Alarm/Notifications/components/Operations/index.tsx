import notificationStyles from "@/pages/Alarm/Notifications/styles/index.less";
import classNames from "classnames";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
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
