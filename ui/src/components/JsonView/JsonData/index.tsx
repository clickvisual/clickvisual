import jsonViewStyles from "@/components/JsonView/index.less";
import { CaretDownOutlined, CaretRightOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import JsonValue from "@/components/JsonView/JsonValue";
import classNames from "classnames";

/**
 * 对数据进行格式化展示
 * @param data 数据
 * @constructor
 */
type JsonDataProps = {
  data: object;
} & _CommonProps;
const JsonData = ({ data, ...restProps }: JsonDataProps) => {
  const [isShow, setIsShow] = useState<boolean>(true);
  const renderStack: string[] = [];
  const indentStyle = {
    paddingLeft: "20px",
  };

  useEffect(() => {
    return () => {
      setIsShow(false);
    };
  }, []);

  /**
   * 处理数据类型
   * @param key
   * @param val
   */
  const handleValueTypes = (key: string, val: any) => {
    let dom: JSX.Element;
    if (typeof val === "object" && val instanceof Array) {
      dom = (
        <span
          className={classNames(
            jsonViewStyles.jsonViewValue,
            jsonViewStyles.jsonViewArray
          )}
        >
          <span>[</span>
          {val.map((item, idx) => {
            renderStack.push("$");
            let isLast = idx === val.length - 1;
            return (
              <div
                style={indentStyle}
                className={classNames(jsonViewStyles.jsonViewArrayItem)}
                key={idx}
              >
                <JsonValue key={key} val={item} {...restProps} />
                {isLast ? "" : ","}
                {renderStack.pop() && ""}
              </div>
            );
          })}
          <span>]</span>
        </span>
      );
    } else {
      dom = <JsonValue key={key} val={val} {...restProps} />;
    }
    return (
      <>
        <span className={classNames(jsonViewStyles.jsonViewKey)}>"{key}"</span>:
        {dom}
      </>
    );
  };

  if (!data) return <div style={indentStyle} />;
  let keys = Object.keys(data);
  let kvList: JSX.Element[] = [];
  keys.forEach((k, idx) => {
    renderStack.push(k);
    let v = Reflect.get(data, k);
    let isLastEle = idx >= keys.length - 1;
    let dom = handleValueTypes(k, v);
    kvList.push(
      <div key={idx}>
        {dom}
        {!isLastEle ? "," : ""}
      </div>
    );
    renderStack.pop();
  });
  if (renderStack.length > 0) {
    return <div style={indentStyle}>{kvList}</div>;
  }
  return (
    <div className={classNames(jsonViewStyles.jsonView)}>
      {kvList.length > 0 &&
        (isShow ? (
          <div className={classNames(jsonViewStyles.jsonViewIcon)}>
            <CaretDownOutlined onClick={() => setIsShow(() => !isShow)} />
          </div>
        ) : (
          <div className={classNames(jsonViewStyles.jsonViewIcon)}>
            <CaretRightOutlined onClick={() => setIsShow(() => !isShow)} />
          </div>
        ))}
      <span>&#123;</span>
      {isShow && <div style={indentStyle}>{kvList}</div>}
      <span>&#125;</span>
    </div>
  );
};

export default JsonData;
