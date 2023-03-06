import { microsecondTimeStamp } from "./time";

/**
 * 链路中用于区分不同类型的值 「」表示接口未传值
 * @param obj
 * @returns
 */
export const handleValueDisplayLogic = (obj: any) => {
  if (obj?.vType) {
    switch (obj.vType) {
      case "INT64":
        return (
          <span style={{ color: "#2fabee" }}>{obj?.vInt64 || "「0」"}</span>
        );

      case "BOOL":
        return (
          <span style={{ color: "#f22222" }}>
            {obj?.vBool?.toString() || "「not BOOL」"}
          </span>
        );

      case "FLOAT64":
        return (
          <span style={{ color: "#00f" }}>
            {obj?.vFloat64 || "「not FLOAT64」"}
          </span>
        );

      case "BINARY":
        return <span style={{ color: "#000" }}>「binary」</span>;

      default:
        return <span>「Contacting an Administrator」</span>;
        break;
    }
  } else {
    return obj?.vStr || "「no vStr」";
  }
};

/**
 * 计算有多少个子元素
 */
export const handleGetChildElementsNumber = (list: any, number: number = 1) => {
  let num = number;
  list.map((item: any) => {
    num++;
    if (item.children && item.children.length > 0) {
      num = handleGetChildElementsNumber(item.children);
    }
  });
  return num;
};

/**
 * 计算总长度
 */
export const handleGetTotalLength = (
  list: any[],
  arr: any[],
  serviceNameList: string[]
) => {
  let spanIdList: any[] = [];
  let referencesSpanIdList: any[] = [];
  list.map((item: any) => {
    if (item?.rawLogJson?.spanId && item?.rawLogJson?.references) {
      referencesSpanIdList.push(item?.rawLogJson?.references[0].spanId);
    }
    spanIdList.push(item?.rawLogJson?.spanId);
    const duration = item?.rawLogJson?.duration
      ? item?.rawLogJson?.duration.slice(0, -1) * Math.pow(10, 6)
      : 0;
    arr.push({
      et: duration + microsecondTimeStamp(item?.rawLogJson?.startTime),
      st: microsecondTimeStamp(item?.rawLogJson?.startTime),
    });
    // name对应主题色
    if (
      item?.rawLogJson?.process?.serviceName &&
      !serviceNameList.includes(item?.rawLogJson?.process?.serviceName)
    ) {
      serviceNameList.push(item?.rawLogJson?.process?.serviceName);
    }
  });
  // 计算假的根节点
  const newList: any[] = [];
  referencesSpanIdList.map((item: string, index: number) => {
    if (!spanIdList.includes(item)) {
      newList.push(item);
    }
  });
  return {
    arr,
    referencesSpanIdList: Array.from(new Set(newList)),
  };
};

// 按时间排序递增
export const compare = () => {
  return function (a: { [x: string]: any }, b: { [x: string]: any }) {
    var value1 = microsecondTimeStamp(a[`rawLogJson`][`startTime`]);
    var value2 = microsecondTimeStamp(b[`rawLogJson`][`startTime`]);
    return value2 - value1;
  };
};
