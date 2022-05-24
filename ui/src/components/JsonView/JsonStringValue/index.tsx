import jsonViewStyles from "@/components/JsonView/index.less";
import classNames from "classnames";
import { LOGMAXTEXTLENGTH } from "@/config/config";
import { Button, message } from "antd";
import { useCallback, useState } from "react";

type JsonStringValueProps = {
  val: string;
  keyItem?: string;
  indexKey?: string;
  isHidden?: boolean;
} & _CommonProps;
export const REG_SEPARATORS = [
  " ",
  "|", //  Ab<span> || </span><span>Bc</span>
  ":",
  ",",
  '"',
  "[",
  "]",
  "{",
  "}",
  "'",
  "=",
  "\u001b",
  "\t",
  "\n",
];

const JsonStringValue = ({
  val,
  keyItem,
  indexKey,
  isHidden,
  ...restProps
}: JsonStringValueProps) => {
  const { onClickValue, highLightValue } = restProps;
  const strListByReg: string[] = splitRawLogString(val);
  const [isHiddens, setisHiddens] = useState<boolean | undefined>(isHidden);
  if (strListByReg.length <= 0) return <></>;

  const highLightFlag = useCallback(
    (value: string) => {
      if (!highLightValue) {
        return false;
      }
      return !!highLightValue.find((item) => {
        if (item.key === keyItem && item.value === value) {
          return true;
        } else if (
          item.key.search(".") !== -1 &&
          indexKey === item.key.split(".")[1] &&
          item.value === value
        ) {
          return true;
        } else if (item.key === "_raw_log_" && item.value === `%${value}%`) {
          return true;
        }
        return false;
      });
    },
    [highLightValue, keyItem, indexKey, val]
  );

  if (isHiddens) {
    const isValue = !REG_SEPARATORS.includes(val);
    return (
      <>
        {val && val.length > LOGMAXTEXTLENGTH && (
          <Button
            type="primary"
            style={{
              height: "18px",
              alignItems: "center",
              display: "inline-flex",
              marginRight: "5px",
            }}
            shape="round"
            size="small"
            onClick={() => setisHiddens(!isHiddens)}
          >
            {isHiddens ? "展开" : "收缩"}
          </Button>
        )}
        <span
          onClick={() => message.info("请先展开再点击~")}
          className={classNames(
            isValue && jsonViewStyles.jsonViewValueHover,
            highLightFlag(val) && jsonViewStyles.jsonViewHighlight
          )}
        >
          {val && val.substring(0, LOGMAXTEXTLENGTH) + "..."}
        </span>
      </>
    );
  } else {
    return (
      <>
        {val && val.length > LOGMAXTEXTLENGTH && (
          <Button
            type="primary"
            style={{
              height: "18px",
              alignItems: "center",
              display: "inline-flex",
              marginRight: "5px",
            }}
            shape="round"
            size="small"
            onClick={() => setisHiddens(!isHiddens)}
          >
            {isHiddens ? "展开" : "收缩"}
          </Button>
        )}
        {strListByReg.map((value, index) => {
          const isValue = !REG_SEPARATORS.includes(value[0]);

          return (
            <span
              key={index}
              onClick={() => isValue && onClickValue?.(value, { key: keyItem })}
              className={classNames(
                isValue && jsonViewStyles.jsonViewValueHover,
                highLightFlag(value) && jsonViewStyles.jsonViewHighlight
              )}
            >
              {value}
            </span>
          );
        })}
      </>
    );
  }
};

const splitRawLogString = (str: string): string[] => {
  const result: string[] = [];
  const strLen = str.length;

  const tail = () => result.pop() || "";
  const isSep = (str: string) => {
    if (!str.length) return false;
    return REG_SEPARATORS.includes(str[0]);
  };

  const pushChar = (char: string) => {
    let last = tail();
    if (last === "") {
      last = char;
    } else if (isSep(last)) {
      result.push(last);
      last = char;
    } else {
      last = last + char;
    }
    result.push(last);
  };

  const pushSeparator = (sep: string) => {
    let last = tail();
    if (last === "") {
      last = sep;
    } else if (!isSep(last)) {
      result.push(last);
      last = sep;
    } else {
      last = last + sep;
    }
    result.push(last);
  };

  for (let strKey = 0; strKey < strLen; strKey++) {
    const char = str[strKey];
    if (REG_SEPARATORS.includes(char)) pushSeparator(char);
    else pushChar(char);
  }

  return result;
};

export default JsonStringValue;
