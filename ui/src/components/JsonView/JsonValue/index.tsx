import jsonViewStyles from "@/components/JsonView/index.less";
import JsonData from "@/components/JsonView/JsonData";
import classNames from "classnames";
import JsonStringValue from "@/components/JsonView/JsonStringValue";

/**
 * 渲染字段
 * @param key
 * @param val
 * @constructor
 */
type JsonValueProps = {
  key: string;
  val: any;
} & _CommonProps;

const JsonValue = ({ key, val, ...restProps }: JsonValueProps) => {
  const { onClickValue } = restProps;
  let dom: JSX.Element = <></>;
  if (!onClickValue) return dom;
  switch (typeof val) {
    case "object":
      if (val instanceof Array) {
        dom = (
          <span className={classNames(jsonViewStyles.jsonViewValue)}>
            <span>[</span>
            {val.map((item, index) => {
              let isLast = index === val.length - 1;
              return (
                <span
                  className={classNames(
                    jsonViewStyles.jsonViewArrayItem,
                    jsonViewStyles.jsonViewValueHover
                  )}
                  key={index}
                >
                  <JsonValue key={key} val={item} {...restProps} />
                  {isLast ? "" : ","}
                </span>
              );
            })}
            <span>]</span>
          </span>
        );
      } else {
        dom = (
          <span className={classNames(jsonViewStyles.jsonViewValue)}>
            <JsonData data={val} />
          </span>
        );
      }
      break;
    case "boolean":
      dom = (
        <span
          onClick={() => onClickValue(val.toString())}
          className={classNames(
            jsonViewStyles.jsonViewValue,
            jsonViewStyles.jsonViewValueHover
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
          onClick={() => onClickValue(val.toString())}
          className={classNames(
            jsonViewStyles.jsonViewValue,
            jsonViewStyles.jsonViewValueHover
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
