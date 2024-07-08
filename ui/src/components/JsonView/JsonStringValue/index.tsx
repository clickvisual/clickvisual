import jsonViewStyles from "@/components/JsonView/index.less";
import classNames from "classnames";
import { LOGMAXTEXTLENGTH, LOGMAXTEXTLENGTHUnParse } from "@/config/config";
import { Button, message, Popover } from "antd";
import { useState } from "react";
import { useIntl } from "umi";
import ClickMenu from "@/pages/DataLogs/components/QueryResult/Content/RawLog/ClickMenu";
import moment from "moment";

type JsonStringValueProps = {
  val: string;
  keyItem?: string;
  indexKey?: string;
  isIndex?: boolean;
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
  // "=", 该分隔符已被移除
  "\u001b",
];

// 不渲染点击菜单的包含项
export const NOT_CLICKVISUAL_MENU = [
  '"',
  ":",
  "\\",
  ":\\",
  '",',
  '"},{',
  " ",
  ",",
  "[{",
  "}]",
  "},",
  "{",
  '"}]},{',
  "  ",
  '{"',
  '","',
  ',"',
  '["',
  '"],"',
  '""},"',
  '"]},"',
  '"[{',
  '"}',
  '"{',
  '}","',
];

export const PRE_SYMBOL = ["\n", "\t"];

const JsonStringValue = ({
  val,
  keyItem,
  indexKey,
  isIndex,
  ...restProps
}: JsonStringValueProps) => {
  const { onClickValue, highLightValue, quickInsertLikeExclusion } = restProps;
  const strListByReg: string[] = splitRawLogString(val);
  const isExceed = (!!val && val.length > LOGMAXTEXTLENGTH) || false;
  const [isHidden, setIsHidden] = useState<boolean>(isExceed);
  const i18n = useIntl();

  const isValue = (value: any) => {
    return !REG_SEPARATORS.includes(value);
  };

  const isNewLine = (value: any) => {
    let flag = false;
    PRE_SYMBOL.map((item: string) => {
      if (value.indexOf(item) > 0) {
        flag = true;
      }
    });
    return flag;
  };

  if (strListByReg.length <= 0) return <></>;

  const highLightFlag = (value: string) => {
    if (!highLightValue) {
      return false;
    }
    return !!highLightValue.find((item) => {
      // 去掉 item.key 中的空格
      const itemKey = item.key.replace(/\s+/g, "");
      if (
        (itemKey === keyItem && item.value.trim() === value.trim()) ||
        item.value.trim() === `%${value}%`
      ) {
        return true;
      } else if (
        itemKey.search(".") !== -1 &&
        indexKey === item.key &&
        item.value === value
      ) {
        return true;
      } else if (itemKey === "_raw_log_" && item.value === `%${value}%`) {
        return true;
      } else if (
        itemKey == keyItem &&
        isValue(value) &&
        item.value.indexOf(value) != -1
      ) {
        return true;
      }
      return false;
    });
  };

  const jsonStringView = strListByReg.map((value, index) => {
    return (
      <span
        key={index}
        onClick={(e) => {
          e.stopPropagation();
        }}
        className={classNames(
          isValue(value) && jsonViewStyles.jsonViewValueHover
        )}
      >
        {NOT_CLICKVISUAL_MENU.includes(value) ? (
          <span
            className={classNames(
              isValue(value) && jsonViewStyles.jsonViewValueHover,
              highLightFlag(value) && jsonViewStyles.jsonViewHighlight
            )}
          >
            {value}
          </span>
        ) : (
          <ClickMenu
            field={keyItem}
            content={value}
            handleAddCondition={() => {
              isValue(value) &&
                onClickValue?.(value, { key: keyItem, indexKey, isIndex });
            }}
            handleOutCondition={() => {
              isValue(value) &&
                quickInsertLikeExclusion?.(value, {
                  key: keyItem,
                  indexKey,
                  isIndex,
                });
            }}
          >
            {["ts", "time"].includes(keyItem as string) ? (
              <Popover
                content={moment(value, "X").format("YYYY-MM-DD HH:mm:ss")}
                trigger="hover"
              >
                <span
                  className={classNames(
                    isValue(value) && jsonViewStyles.jsonViewValueHover,
                    highLightFlag(value) && jsonViewStyles.jsonViewHighlight
                  )}
                >
                  {value}
                </span>
              </Popover>
            ) : (
              <span
                className={classNames(
                  isValue(value) && jsonViewStyles.jsonViewValueHover,
                  highLightFlag(value) && jsonViewStyles.jsonViewHighlight
                )}
              >
                {value}
              </span>
            )}
          </ClickMenu>
        )}
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
        >
          {val && val.substring(0, LOGMAXTEXTLENGTH) + "..."}
        </span>
      ) : isNewLine(val) ? (
        <pre className={jsonViewStyles.pre}>{jsonStringView}</pre>
      ) : (
        <span className={jsonViewStyles.pre}>{jsonStringView}</span>
      )}
    </>
  );
};

const splitRawLogString = (str: string): string[] => {
  if (str.length > LOGMAXTEXTLENGTHUnParse) {
    return [str]
  }
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
