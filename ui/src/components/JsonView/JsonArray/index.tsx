import classNames from "classnames";
import jsonViewStyles from "@/components/JsonView/index.less";
import { CaretDownOutlined, CaretRightOutlined } from "@ant-design/icons";
import JsonValue from "@/components/JsonView/JsonValue";
import { useState } from "react";
type JsonArrayProps = {
  data: Array<any>;
  hierarchy: number;
};
const JsonArray = ({ data, hierarchy, ...restProps }: JsonArrayProps) => {
  const [isShowJson, setIsShowJson] = useState<boolean>(false);

  const indentStyle = {
    paddingLeft: "20px",
  };

  return (
    <div className={classNames(jsonViewStyles.jsonView)}>
      {data.length > 0 &&
        (isShowJson ? (
          <div className={classNames(jsonViewStyles.jsonViewIcon)}>
            <CaretDownOutlined
              onClick={() => setIsShowJson(() => !isShowJson)}
            />
          </div>
        ) : (
          <div className={classNames(jsonViewStyles.jsonViewIcon)}>
            <CaretRightOutlined
              onClick={() => setIsShowJson(() => !isShowJson)}
            />
          </div>
        ))}
      <span>[</span>
      {isShowJson &&
        data.length > 0 &&
        data.map((item, idx) => {
          let isLast = idx === data.length - 1;
          return (
            <div
              style={indentStyle}
              className={classNames(jsonViewStyles.jsonViewArrayItem)}
              key={idx}
            >
              <JsonValue
                jsonKey={item}
                val={item}
                hierarchy={hierarchy + 1}
                {...restProps}
              />
              {isLast ? "" : ","}
            </div>
          );
        })}
      <span>]</span>
    </div>
  );
};
export default JsonArray;
