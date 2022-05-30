import jsonViewStyles from "@/components/JsonView/index.less";
import classNames from "classnames";
import { LOGMAXTEXTLENGTH } from "@/config/config";
import { Button, message } from "antd";
import { useCallback, useState } from "react";
import { useIntl } from "umi";

type JsonStringValueProps = {
  val: string;
  keyItem?: string;
  indexKey?: string;
} & _CommonProps;
export const REG_SEPARATORS = [
  " ",
  "|", //  Ab<span> || </span><span>Bc</span>
  ",",
  '"',
  "[",
  "]",
  "{",
  "}",
  "'",
  "=",
  "\u001b",
];

const JsonStringValue = ({
  val,
  keyItem,
  indexKey,
  ...restProps
}: JsonStringValueProps) => {
  const { onClickValue, highLightValue } = restProps;
  const strListByReg: string[] = splitRawLogString(val);
  const isExceed = val && val.length > LOGMAXTEXTLENGTH;
  const [isHidden, setIsHidden] = useState<boolean | undefined>(
    isExceed || false
  );
  const i18n = useIntl();

  const isValue = (value: any) => {
    return !REG_SEPARATORS.includes(value);
  };
  const isNewLine = (value: any) => {
    return value.includes("\n");
  };
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

  const jsonStringView = strListByReg.map((value, index) => {
    return (
      <span
        key={index}
        onClick={() =>
          isValue(value) && onClickValue?.(value, { key: keyItem })
        }
        className={classNames(
          isValue(value) && jsonViewStyles.jsonViewValueHover,
          highLightFlag(value) && jsonViewStyles.jsonViewHighlight
        )}
      >
        {value}
      </span>
    );
  });
  return (
    <>
      {isExceed && (
        <Button
          type="primary"
          className={jsonViewStyles.hiddenButton}
          shape="round"
          size="small"
          onClick={() => setIsHidden(!isHidden)}
        >
          {isHidden
            ? i18n.formatMessage({
                id: "systemSetting.role.collapseX.unfold",
              })
            : i18n.formatMessage({
                id: "systemSetting.role.collapseX.packUp",
              })}
        </Button>
      )}
      {isHidden ? (
        <span
          onClick={() =>
            message.info(i18n.formatMessage({ id: "log.JsonView.unfoldTip" }))
          }
          className={classNames(
            isValue(val) && jsonViewStyles.jsonViewValueHover,
            highLightFlag(val) && jsonViewStyles.jsonViewHighlight
          )}
        >
          {val && val.substring(0, LOGMAXTEXTLENGTH) + "..."}
        </span>
      ) : isNewLine(strListByReg) ? (
        <pre className={jsonViewStyles.pre}>{jsonStringView}</pre>
      ) : (
        <span className={jsonViewStyles.pre}>{jsonStringView}</span>
      )}
    </>
  );
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
