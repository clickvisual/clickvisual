import {useIntl} from "umi";

const useAlarmStorages = () => {
  const i18n = useIntl();
  const AlarmStorages = [
    {
      label: i18n.formatMessage({
        id: "instance.form.title.ruleStoreType.radio.off",
      }),
      value: 0,
    },
    {
      label: i18n.formatMessage({
        id: "instance.form.title.ruleStoreType.radio.file",
      }),
      value: 1,
    },
    {
      label: i18n.formatMessage({
        id: "instance.form.title.k8s",
      }),
      value: 2,
    },
  ];
  return { AlarmStorages };
};
export default useAlarmStorages;
