import { useIntl } from "umi";

const useAlarmEnums = () => {
  const i18n = useIntl();
  const ChannelTypes = [
    { name: i18n.formatMessage({ id: "dingTalk" }), value: 1 },
  ];
  return { ChannelTypes };
};
export default useAlarmEnums;
