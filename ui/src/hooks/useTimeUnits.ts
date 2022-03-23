import { useIntl } from "umi";

const useTimeUnits = () => {
  const i18n = useIntl();

  const FrequencyTypes = [
    { key: 0, value: i18n.formatMessage({ id: "frequency.hour" }) },
    { key: 1, value: i18n.formatMessage({ id: "frequency.day" }) },
    { key: 2, value: i18n.formatMessage({ id: "frequency.week" }) },
    { key: 3, value: i18n.formatMessage({ id: "frequency.ft" }) },
  ];

  const FixedTimeUnits = [
    { key: 1, label: i18n.formatMessage({ id: "unit.second" }) },
    { key: 0, label: i18n.formatMessage({ id: "unit.minute" }) },
    { key: 2, label: i18n.formatMessage({ id: "unit.hour" }) },
    { key: 3, label: i18n.formatMessage({ id: "unit.day" }) },
    { key: 4, label: i18n.formatMessage({ id: "unit.week" }) },
    // { key: 5, label: i18n.formatMessage({ id: "unit.year" }) },
  ];

  const weekList = [
    { key: 0, value: i18n.formatMessage({ id: "week.mon" }) },
    { key: 1, value: i18n.formatMessage({ id: "week.tue" }) },
    { key: 2, value: i18n.formatMessage({ id: "week.wed" }) },
    { key: 3, value: i18n.formatMessage({ id: "week.thurs" }) },
    { key: 4, value: i18n.formatMessage({ id: "week.fri" }) },
    { key: 5, value: i18n.formatMessage({ id: "week.sat" }) },
    { key: 6, value: i18n.formatMessage({ id: "week.sun" }) },
  ];
  return { weekList, FrequencyTypes, FixedTimeUnits };
};
export default useTimeUnits;
