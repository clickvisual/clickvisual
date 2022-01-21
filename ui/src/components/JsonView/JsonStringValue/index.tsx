import jsonViewStyles from "@/components/JsonView/index.less";

type JsonStringValueProps = {
  val: string;
} & _CommonProps;
const JsonStringValue = ({ val, ...restProps }: JsonStringValueProps) => {
  const { onClickValue } = restProps;
  let dom: JSX.Element[];
  const strListBySpace = val.split(" ");
  console.log(strListBySpace);
  if (strListBySpace.length > 0 && onClickValue) {
    dom = strListBySpace.map((str, index) => (
      <>
        <span
          onClick={() => onClickValue(str)}
          key={index}
          className={jsonViewStyles.jsonViewValueHover}
        >
          {str}
        </span>
        {index < strListBySpace.length - 1 && <span>&nbsp;</span>}
      </>
    ));
    return <>{dom.length > 0 && dom}</>;
  }
  return <></>;
};

export default JsonStringValue;
