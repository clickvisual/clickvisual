import { Button, Popover } from "antd";
import { CaretDownFilled } from "@ant-design/icons";
import darkTimeStyles from "@/pages/DataLogs/components/DateTimeSelected/index.less";
import React, { useEffect, useRef } from "react";
import DateTimeSelectedCard from "@/pages/DataLogs/components/DateTimeSelected/DateTimeSelectedCard";
import { useModel } from "@@/plugin-model/useModel";
import { timeStampFormat } from "@/utils/momentUtils";
import { ACTIVE_TIME_NOT_INDEX, TimeRangeType } from "@/config/config";
import { useIntl } from "umi";

export type TimeUnit =
  | "seconds"
  | "minutes"
  | "hours"
  | "days"
  | "weeks"
  | "months"
  | "years";

export type TimeOption = {
  title: string;
  relativeAmount: number;
  relativeUnit: TimeUnit;
};

type DarkTimeContextType = {
  timeOptions: TimeOption[];
  TabName: { [TimeRangeType.Relative]: string; [TimeRangeType.Custom]: string };
};
export const DarkTimeContext = React.createContext<DarkTimeContextType>({
  timeOptions: [],
  TabName: {
    [TimeRangeType.Relative]: "",
    [TimeRangeType.Custom]: "",
  },
});

const DarkTimeSelect = () => {
  const {
    activeTabKey,
    activeTimeOptionIndex,
    startDateTime,
    endDateTime,
    onChangeCurrentRelativeAmount,
    onChangeCurrentRelativeUnit,
  } = useModel("dataLogs");
  const i18n = useIntl();

  const TabName = {
    [TimeRangeType.Relative]: i18n.formatMessage({ id: "dateTime.relative" }),
    [TimeRangeType.Custom]: i18n.formatMessage({ id: "dateTime.custom" }),
  };
  const isFirstLoadRef = useRef<boolean>(true);

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

  useEffect(() => {
    if (isFirstLoadRef.current && activeTabKey === TimeRangeType.Relative) {
      onChangeCurrentRelativeAmount(
        timeOptions[activeTimeOptionIndex]?.relativeAmount
      );
      onChangeCurrentRelativeUnit(
        timeOptions[activeTimeOptionIndex]?.relativeUnit
      );
      isFirstLoadRef.current = false;
    }
  }, []);
  return (
    <DarkTimeContext.Provider
      value={{
        timeOptions,
        TabName,
      }}
    >
      <Popover
        overlayClassName={darkTimeStyles.darkTimeSelect}
        placement="bottomRight"
        content={<DateTimeSelectedCard />}
        trigger="click"
      >
        <Button className={darkTimeStyles.darkTimeBtn}>
          <span>
            {activeTabKey === TimeRangeType.Relative
              ? `${
                  activeTimeOptionIndex !== ACTIVE_TIME_NOT_INDEX
                    ? timeOptions[activeTimeOptionIndex]?.title
                    : ""
                }`
              : activeTabKey === TimeRangeType.Custom &&
                `${timeStampFormat(
                  startDateTime as number
                )} ~ ${timeStampFormat(endDateTime as number)}`}
          </span>
          <span>
            {startDateTime && endDateTime && `（${TabName[activeTabKey]}）`}
          </span>
          <CaretDownFilled />
        </Button>
      </Popover>
    </DarkTimeContext.Provider>
  );
};
export default DarkTimeSelect;
