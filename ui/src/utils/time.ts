import moment from "moment";

/**
 * 微秒级别时间格式转时间戳
 * @param time string "2022-09-02T02:31:49.006385319Z"
 * @returns  number 1662085909006385
 */
export const microsecondTimeStamp: (time: string) => number = (
  time: string
) => {
  return parseInt(
    moment(time.split(".")[0] + "Z").valueOf() / 1000 +
      time.split(".")[1].substring(0, 6)
  );
};

/**
 * 微秒级别的时间单位转换  范围us~s
 * 小数点小于等于2位
 * @param time  number 1000
 * @returns string  0.000001ms
 */
export const nanosecondTimeUnitConversion = (time: number) => {
  console.log(time, "time");
  if (time > Math.pow(10, 6)) {
    const list = (time / Math.pow(10, 6)).toString().split(".");
    const num =
      list.length > 1 ? (list[1].length <= 2 ? list[1].length : 2) : 0;
    return (time / Math.pow(10, 6)).toFixed(num) + "s";
  }
  if (time > Math.pow(10, 3)) {
    const list = (time / Math.pow(10, 3)).toString().split(".");
    const num =
      list.length > 1 ? (list[1].length <= 2 ? list[1].length : 2) : 0;
    return (time / Math.pow(10, 3)).toFixed(num) + "ms";
  } else {
    const list = time.toString().split(".");
    const num =
      list.length > 1 ? (list[1].length <= 2 ? list[1].length : 2) : 0;
    return time.toFixed(num) + "us";
  }
};
