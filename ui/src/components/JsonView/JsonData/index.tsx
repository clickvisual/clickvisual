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
  const [isShowJson, setIsShowJson] = useState<boolean>(false);

  const renderStack: string[] = [];
  const indentStyle = {
    paddingLeft: "20px",
  };

  useEffect(() => {
    return () => {
      setIsShowJson(false);
    };
  }, []);

  /**
   * 处理数据类型
   * @param key
   * @param val
   */
  const handleValueTypes = (key: string, val: any) => {
    return (
      <>
        <span className={classNames(jsonViewStyles.jsonViewKey)}>"{key}"</span>:
        <JsonValue jsonKey={key} val={val} {...restProps} />
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
      <span>&#123;</span>
      {isShowJson && kvList.length > 0 && (
        <div style={indentStyle}>{kvList}</div>
      )}
      <span>&#125;</span>
    </div>
  );
};

export default JsonData;
