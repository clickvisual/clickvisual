import darkTimeStyles from '@/pages/DataLogs/components/DateTimeSelected/index.less';
import { useModel } from '@@/plugin-model/useModel';
import moment from 'moment';
import { currentTimeStamp, timeStampFormat } from '@/utils/momentUtils';
import { useContext, useState } from 'react';
import classNames from 'classnames';
import { DarkTimeContext, TimeUnit } from '@/pages/DataLogs/components/DateTimeSelected';
import { PaneType } from '@/models/dataLogs';

type RelativeTimeProps = {};
const RelativeTime = (props: RelativeTimeProps) => {
  const {
    logPanes,
    currentLogLibrary,
    startDateTime,
    endDateTime,
    onChangeStartDateTime,
    onChangeEndDateTime,
    activeTimeOptionIndex,
    onChangeLogPane,
    onChangeActiveTimeOptionIndex,
  } = useModel('dataLogs');
  const [startTime, setStartTime] = useState<number>(startDateTime as number);
  const [endTime, setEndTime] = useState<number>(endDateTime as number);
  const { timeOptions } = useContext(DarkTimeContext);

  const oldPane = logPanes.find((item) => item.pane === currentLogLibrary) as PaneType;

  const handleSelect = (relativeAmount: number, relativeUnit: TimeUnit, index: number) => {
    const start = moment().subtract(relativeAmount, relativeUnit).unix();
    const end = currentTimeStamp();
    onChangeStartDateTime(start);
    onChangeEndDateTime(end);

    onChangeLogPane({ ...oldPane, start, end, activeIndex: index });
  };

  const handleMouseEnter = (relativeAmount: number, relativeUnit: TimeUnit) => {
    setStartTime(moment().subtract(relativeAmount, relativeUnit).unix());
    setEndTime(currentTimeStamp());
  };

  const handleMouseLeave = () => {
    setStartTime(startDateTime as number);
    setEndTime(endDateTime as number);
  };

  return (
    <div className={darkTimeStyles.tabCard}>
      <div className={darkTimeStyles.defaultTime}>
        {timeStampFormat(startTime)} ~ {timeStampFormat(endTime)}
      </div>
      <div className={darkTimeStyles.row}>
        {timeOptions.map((option, index) => (
          <div
            key={index}
            onClick={() => {
              handleSelect(option.relativeAmount, option.relativeUnit, index);
              onChangeActiveTimeOptionIndex(index);
            }}
            className={classNames(darkTimeStyles.timeOption, {
              [darkTimeStyles.activeOption]: index === activeTimeOptionIndex,
            })}
            onMouseEnter={() => handleMouseEnter(option.relativeAmount, option.relativeUnit)}
            onMouseLeave={() => handleMouseLeave()}
          >
            {option.title}
          </div>
        ))}
      </div>
    </div>
  );
};
export default RelativeTime;
