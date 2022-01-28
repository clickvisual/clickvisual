import jsonViewStyles from "@/components/JsonView/index.less";
import JsonData from "@/components/JsonView/JsonData";
import classNames from "classnames";
import JsonStringValue from "@/components/JsonView/JsonStringValue";
import { useMemo, useState } from "react";
import { CaretDownOutlined, CaretRightOutlined } from "@ant-design/icons";

/**
 * 渲染字段
 * @param key
 * @param val
 * @constructor
 */
type JsonValueProps = {
  jsonKey: string | undefined;
  val: any;
} & _CommonProps;

const JsonValue = ({ jsonKey, val, ...restProps }: JsonValueProps) => {
  const { onClickValue, highLightValue } = restProps;
  const [isShowArr, setIsShowArr] = useState<boolean>(true);
  const indentStyle = {
    paddingLeft: "20px",
  };
  let dom: JSX.Element = <></>;

  const highLightFlag = useMemo(() => {
    if (!highLightValue || ["object", "string"].includes(typeof val))
      return false;

    return !!highLightValue.find(
      (item) => item.key === "_raw_log_" && item.value === `%${val}%`
    );
  }, [highLightValue, val]);

  switch (typeof val) {
    case "object":
      if (val instanceof Array) {
        dom = (
          <span className={classNames(jsonViewStyles.jsonViewValue)}>
            {val.length > 0 &&
              (isShowArr ? (
                <div className={classNames(jsonViewStyles.jsonViewIcon)}>
                  <CaretDownOutlined
                    onClick={() => setIsShowArr(() => !isShowArr)}
                  />
                </div>
              ) : (
                <div className={classNames(jsonViewStyles.jsonViewIcon)}>
                  <CaretRightOutlined
                    onClick={() => setIsShowArr(() => !isShowArr)}
                  />
                </div>
              ))}
            <span>[</span>
            {val.length > 0 &&
              isShowArr &&
              val.map((item, idx) => {
                let isLast = idx === val.length - 1;
                return (
                  <div
                    style={indentStyle}
                    className={classNames(jsonViewStyles.jsonViewArrayItem)}
                    key={idx}
                  >
                    <JsonValue jsonKey={jsonKey} val={item} {...restProps} />
                    {isLast ? "" : ","}
                  </div>
                );
              })}
            <span>]</span>
          </span>
        );
      } else if (val === null) {
        dom = (
          <span className={classNames(jsonViewStyles.jsonViewValue)}>null</span>
        );
      } else {
        dom = (
          <span className={classNames(jsonViewStyles.jsonViewValue)}>
            <JsonData data={val} {...restProps} />
          </span>
        );
      }
      break;
    case "boolean":
      dom = (
        <span
          onClick={() => onClickValue?.(val.toString())}
          className={classNames(
            jsonViewStyles.jsonViewValue,
            jsonViewStyles.jsonViewValueHover,
            highLightFlag && jsonViewStyles.jsonViewHighlight
          )}
        >
          {val.toString()}
        </span>
      );
      break;
    case "string":
      dom = (
        <span className={classNames(jsonViewStyles.jsonViewValue)}>
          "<JsonStringValue val={val} {...restProps} />"
        </span>
      );
      break;
    case "number":
    case "bigint":
      dom = (
        <span
          onClick={() => onClickValue?.(val.toString())}
          className={classNames(
            jsonViewStyles.jsonViewValue,
            jsonViewStyles.jsonViewValueHover,
            highLightFlag && jsonViewStyles.jsonViewHighlight
          )}
        >
          {val}
        </span>
      );
      break;
  }
  return dom;
};

export default JsonValue;
