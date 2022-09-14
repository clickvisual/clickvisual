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
export const microsecondsTimeUnitConversion = (time: number) => {
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

/**
 * 时间区间转单位
 * 1、（年月日）：时间区间大于等于30天 || 时间区间跨年了且大于等于1天
 * 2、（年月日时分秒）： 时间区间跨年了且小于1天
 * 3、（月日）：区间大于等于7天小于30天  ||  时间区间跨月了且大于等于1天
 * 4、（月日时分秒）： 时间区间跨月了且小于1天 || 时间区间大于等于1天小于7天 ||  时间区间跨天了
 * 5、（时分秒）：时间区间小于1天
 */

export const timeIntervalIsConvertedIntoUnits = (
  startTIme: number,
  endTime: number
) => {
  // 1、（年月日）：时间区间大于等于30天 || 时间区间跨年了且大于等于1天
  if (
    endTime - startTIme >= 86400 * 30 ||
    (moment(startTIme * 1000).format("YYYY") !=
      moment(endTime * 1000).format("YYYY") &&
      endTime - startTIme >= 86400)
  ) {
    return "YYYY/MM/DD";
  }
  // 2、（年月日时分秒）： 时间区间跨年了且小于1天
  if (
    moment(startTIme * 1000).format("YYYY") !=
      moment(endTime * 1000).format("YYYY") &&
    endTime - startTIme < 86400
  ) {
    return "YYYY/MM/DD HH:mm:ss";
  }
  // 3、（月日）：区间大于等于7天小于30天  ||  时间区间跨月了且大于等于1天
  if (
    (endTime - startTIme >= 86400 * 7 && endTime - startTIme < 86400 * 30) ||
    (moment(startTIme * 1000).format("YYYY/MM") !=
      moment(endTime * 1000).format("YYYY/MM") &&
      endTime - startTIme >= 86400)
  ) {
    return "MM/DD";
  }
  // 4、（月日时分秒）： 时间区间跨月了且小于1天
  // 5、（月日，时分秒）：时间区间大于等于1天小于7天 ||  时间区间跨天了
  if (
    (moment(startTIme * 1000).format("YYYY/MM") !=
      moment(endTime * 1000).format("YYYY/MM") &&
      endTime - startTIme < 86400) ||
    (endTime - startTIme >= 86400 && endTime - startTIme < 86400 * 7) ||
    moment(startTIme * 1000).format("YYYY/MM/DD") !=
      moment(endTime * 1000).format("YYYY/MM/DD")
  ) {
    return "MM/DD HH:mm:ss";
  }
  // 6、（时分秒）：时间区间小于1天
  if (endTime - startTIme < 86400) {
    return "HH:mm:ss";
  } else {
    return "HH:mm:ss";
  }
};
