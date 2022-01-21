import jsonViewStyles from "@/components/JsonView/index.less";
import { useContext } from "react";
import { JsonViewContext } from "@/components/JsonView";
import FormatData from "@/components/JsonView/FormatData";
import classNames from "classnames";

/**
 * 渲染字段
 * @param key
 * @param val
 * @constructor
 */
type RenderValueProps = {
  key: string;
  val: any;
};

const RenderValue = ({ key, val }: RenderValueProps) => {
  const { onClick } = useContext(JsonViewContext);
  let dom: JSX.Element = <></>;
  switch (typeof val) {
    case "object":
      if (val instanceof Array) {
        dom = (
          <span
            className={classNames(
              jsonViewStyles.jsonViewValue,
              jsonViewStyles.jsonViewArray
            )}
          >
            <span>[</span>
            {val.map((item, index) => {
              let isLast = index === val.length - 1;
              return (
                <span
                  className={classNames(jsonViewStyles.jsonViewArrayItem)}
                  key={index}
                >
                  <RenderValue key={key} val={item} />
                  {isLast ? "" : ","}
                </span>
              );
            })}
            <span>]</span>
          </span>
        );
      } else {
        dom = (
          <span className={"jsonViewValue __react-json-view-object"}>
            <FormatData data={val} />
          </span>
        );
      }
      break;
    case "boolean":
      dom = (
        <span
          onClick={() => onClick(val.toString())}
          className={"jsonViewValue __react-json-view-bool"}
        >
          {val ? "true" : "false"}
        </span>
      );
      break;
    case "string":
      dom = (
        <span
          onClick={() => onClick(val)}
          className={classNames(
            jsonViewStyles.jsonViewValue,
            jsonViewStyles.jsonViewString
          )}
        >
          "{val}"
        </span>
      );
      break;
    case "number":
    case "bigint":
      dom = (
        <span
          onClick={() => onClick(val.toString())}
          className={"jsonViewValue __react-json-view-number"}
        >
          {val}
        </span>
      );
      break;
  }
  return dom;
};

export default RenderValue;
