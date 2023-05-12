import { ACTIVE_TIME_NOT_INDEX, TimeRangeType } from "@/config/config";
import DateTimeSelectedCard from "@/pages/DataLogs/components/DateTimeSelected/DateTimeSelectedCard";
import darkTimeStyles from "@/pages/DataLogs/components/DateTimeSelected/index.less";
import useTimeOptions from "@/pages/DataLogs/hooks/useTimeOptions";
import { timeStampFormat } from "@/utils/momentUtils";
import { CaretDownFilled } from "@ant-design/icons";
import { useModel } from "@umijs/max";
import { Button, Popover } from "antd";
import React, { useEffect, useRef, useState } from "react";
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
  const [visibleTime, setVisibleTime] = useState<boolean>(false);

  const { timeOptions } = useTimeOptions();

  const TabName = {
    [TimeRangeType.Relative]: i18n.formatMessage({ id: "dateTime.relative" }),
    [TimeRangeType.Custom]: i18n.formatMessage({ id: "dateTime.custom" }),
  };
  const isFirstLoadRef = useRef<boolean>(true);

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
        content={<DateTimeSelectedCard onChangeVisble={setVisibleTime} />}
        trigger="click"
        open={visibleTime}
        onOpenChange={setVisibleTime}
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
