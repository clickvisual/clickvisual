import { useIntl } from "umi";

const useAlarmEnums = () => {
  const i18n = useIntl();
  const ChannelTypes = [
    { name: i18n.formatMessage({ id: "dingTalk" }), value: 1 },
  ];
  const AlarmStatus = [
    {
      status: 1,
      label: "未开启",
      color: "#108ee9",
    },
    {
      status: 2,
      label: "已开启",
      color: "#87d068",
    },
    {
      status: 3,
      label: "正在报警",
      color: "#f50",
    },
  ];
  return { ChannelTypes, AlarmStatus };
};
export default useAlarmEnums;
