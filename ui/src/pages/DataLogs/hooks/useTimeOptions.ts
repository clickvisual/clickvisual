import { TimeOption } from "@/pages/DataLogs/components/DateTimeSelected";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { PaneType } from "@/models/dataLogs";
import { ACTIVE_TIME_INDEX, TimeRangeType } from "@/config/config";

const useTimeOptions = () => {
  const i18n = useIntl();
  const { onChangeCurrentRelativeAmount, onChangeCurrentRelativeUnit } =
    useModel("dataLogs");
  const timeOptions: TimeOption[] = [
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.minutes" },
        { num: 1, plural: "" }
      ),
      relativeAmount: 1,
      relativeUnit: "minutes",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.minutes" },
        { num: 5, plural: "s" }
      ),
      relativeAmount: 5,
      relativeUnit: "minutes",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.minutes" },
        { num: 15, plural: "s" }
      ),
      relativeAmount: 15,
      relativeUnit: "minutes",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.minutes" },
        { num: 30, plural: "s" }
      ),
      relativeAmount: 30,
      relativeUnit: "minutes",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.hours" },
        { num: 1, plural: "" }
      ),
      relativeAmount: 1,
      relativeUnit: "hours",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.hours" },
        { num: 3, plural: "s" }
      ),
      relativeAmount: 3,
      relativeUnit: "hours",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.hours" },
        { num: 12, plural: "s" }
      ),
      relativeAmount: 12,
      relativeUnit: "hours",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.days" },
        { num: 1, plural: "" }
      ),
      relativeAmount: 1,
      relativeUnit: "days",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.days" },
        { num: 3, plural: "s" }
      ),
      relativeAmount: 3,
      relativeUnit: "days",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.days" },
        { num: 5, plural: "s" }
      ),
      relativeAmount: 5,
      relativeUnit: "days",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.days" },
        { num: 7, plural: "s" }
      ),
      relativeAmount: 7,
      relativeUnit: "days",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.days" },
        { num: 30, plural: "s" }
      ),
      relativeAmount: 30,
      relativeUnit: "days",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.months" },
        { num: 3, plural: "s" }
      ),
      relativeAmount: 3,
      relativeUnit: "months",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.months" },
        { num: 6, plural: "s" }
      ),
      relativeAmount: 6,
      relativeUnit: "months",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.years" },
        { num: 1, plural: "" }
      ),
      relativeAmount: 1,
      relativeUnit: "years",
    },
    {
      title: i18n.formatMessage(
        { id: "dateTime.option.years" },
        { num: 2, plural: "s" }
      ),
      relativeAmount: 2,
      relativeUnit: "years",
    },
  ];

  const handleChangeRelativeAmountAndUnit = (tabPane: PaneType) => {
    if (tabPane?.activeTabKey === TimeRangeType.Custom) return;
    onChangeCurrentRelativeAmount(
      timeOptions[tabPane?.activeIndex || ACTIVE_TIME_INDEX]?.relativeAmount
    );
    onChangeCurrentRelativeUnit(
      timeOptions[tabPane?.activeIndex || ACTIVE_TIME_INDEX]?.relativeUnit
    );
  };

  return { timeOptions, handleChangeRelativeAmountAndUnit };
};
export default useTimeOptions;
