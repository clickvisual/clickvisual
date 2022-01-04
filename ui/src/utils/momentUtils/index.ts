import moment from 'moment';

export const timeStampFormat = (TimeStamp: number) => {
  return moment(TimeStamp, 'X').format('YYYY-MM-DD HH:mm:ss');
};

export const currentTimeStamp = () => {
  return parseInt(moment().format('X'));
};
