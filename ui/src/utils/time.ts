import moment from "moment";

// "2022-09-02T02:31:49.006385319Z" -> 1662085909006385
export const microsecondTimeStamp: (time: string) => number = (
  time: string
) => {
  return parseInt(
    moment(time.split(".")[0] + "Z").valueOf() / 1000 +
      time.split(".")[1].substring(0, 6)
  );
};
