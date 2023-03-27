import dayjs from "dayjs";

export const timeStampFormat = (TimeStamp: number) => {
  return dayjs(TimeStamp, "X").format("YYYY-MM-DD HH:mm:ss");
};

export const currentTimeStamp = () => {
  return parseInt(dayjs().format("X"));
};
