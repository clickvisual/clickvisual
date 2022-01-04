import { Button, Popover } from 'antd';
import { CaretDownFilled } from '@ant-design/icons';
import darkTimeStyles from '@/pages/DataLogs/components/DateTimeSelected/index.less';
import React from 'react';
import DateTimeSelectedCard from '@/pages/DataLogs/components/DateTimeSelected/DateTimeSelectedCard';
import { useModel } from '@@/plugin-model/useModel';
import { timeStampFormat } from '@/utils/momentUtils';
import { ACTIVE_TIME_NOT_INDEX, TabName, TimeRangeType } from '@/config/config';

export type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

export type TimeOption = {
  title: string;
  relativeAmount: number;
  relativeUnit: TimeUnit;
};

const timeOptions: TimeOption[] = [
  {
    title: '1 分钟',
    relativeAmount: 1,
    relativeUnit: 'minutes',
  },
  {
    title: '5 分钟',
    relativeAmount: 5,
    relativeUnit: 'minutes',
  },
  {
    title: '15 分钟',
    relativeAmount: 15,
    relativeUnit: 'minutes',
  },
  {
    title: '30 分钟',
    relativeAmount: 30,
    relativeUnit: 'minutes',
  },
  {
    title: '1 小时',
    relativeAmount: 1,
    relativeUnit: 'hours',
  },
  {
    title: '3 小时',
    relativeAmount: 3,
    relativeUnit: 'hours',
  },
  {
    title: '12 小时',
    relativeAmount: 12,
    relativeUnit: 'hours',
  },
  {
    title: '1 天',
    relativeAmount: 1,
    relativeUnit: 'days',
  },
  {
    title: '3 天',
    relativeAmount: 3,
    relativeUnit: 'days',
  },
  {
    title: '5 天',
    relativeAmount: 5,
    relativeUnit: 'days',
  },
  {
    title: '7 天',
    relativeAmount: 7,
    relativeUnit: 'days',
  },
  {
    title: '30 天',
    relativeAmount: 30,
    relativeUnit: 'days',
  },
  {
    title: '3 个月',
    relativeAmount: 3,
    relativeUnit: 'months',
  },
  {
    title: '6 个月',
    relativeAmount: 6,
    relativeUnit: 'months',
  },
  {
    title: '1 年',
    relativeAmount: 1,
    relativeUnit: 'years',
  },
  {
    title: '2 年',
    relativeAmount: 2,
    relativeUnit: 'years',
  },
];

type DarkTimeContextType = {
  timeOptions: TimeOption[];
};
export const DarkTimeContext = React.createContext<DarkTimeContextType>({
  timeOptions,
});

type DarkTimeSelectProps = {};
const DarkTimeSelect = (props: DarkTimeSelectProps) => {
  const { activeTabKey, activeTimeOptionIndex, startDateTime, endDateTime } = useModel('dataLogs');

  return (
    <DarkTimeContext.Provider
      value={{
        timeOptions,
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
                    : ''
                }`
              : activeTabKey === TimeRangeType.Custom &&
                `${timeStampFormat(startDateTime as number)} ~ ${timeStampFormat(
                  endDateTime as number,
                )}`}
          </span>
          <span>{startDateTime && endDateTime && `（${TabName[activeTabKey]}）`}</span>
          <CaretDownFilled />
        </Button>
      </Popover>
    </DarkTimeContext.Provider>
  );
};
export default DarkTimeSelect;
