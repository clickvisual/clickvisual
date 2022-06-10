import { useIntl } from "umi";

const useAlarmEnums = () => {
  const i18n = useIntl();
  const ChannelTypes = [
    { name: i18n.formatMessage({ id: "dingTalk" }), value: 1 },
    { name: i18n.formatMessage({ id: "Feishu" }), value: 3 },
    { name: i18n.formatMessage({ id: "Slack" }), value: 4 },
  ];
  const AlarmStatus = [
    {
      status: 1,
      label: i18n.formatMessage({ id: "alarm.rules.state.paused" }),
      color: "#7d8085",
      icon: "icon-suspended",
    },
    {
      status: 2,
      label: i18n.formatMessage({ id: "alarm.rules.state.ok" }),
      color: "#87d068",
      icon: "icon-love-successful",
    },
    {
      status: 3,
      label: i18n.formatMessage({ id: "alarm.rules.state.alerting" }),
      color: "#b22e33",
      icon: "icon-love-failure",
    },
  ];
  return { ChannelTypes, AlarmStatus };
};
export default useAlarmEnums;
