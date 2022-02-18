import jsonViewStyles from "@/components/JsonView/index.less";
import classNames from "classnames";

type JsonStringValueProps = {
  val: string;
} & _CommonProps;
const REG_SEPARATORS = [
  " ",
  "|", //  Ab<span> || </span><span>Bc</span>
  ":",
  "-",
  "/",
  '"',
  "[",
  "]",
  "{",
  "}",
  "'",
  "\u001b",
  "\t",
  "\n",
];

const JsonStringValue = ({ val, ...restProps }: JsonStringValueProps) => {
  const { onClickValue, highLightValue } = restProps;
  const strListByReg: string[] = splitRawLogString(val);
  if (strListByReg.length <= 0) return <></>;

  return (
    <>
      {strListByReg.map((value, index) => {
        const isValue = !REG_SEPARATORS.includes(value[0]);

        let highLightFlag = false;
        if (highLightValue) {
          highLightFlag = !!highLightValue.find(
            (item) => item.key === "_raw_log_" && item.value === `%${value}%`
          );
        }

        return (
          <span
            key={index}
            onClick={() => isValue && onClickValue?.(value)}
            className={classNames(
              isValue && jsonViewStyles.jsonViewValueHover,
              highLightFlag && jsonViewStyles.jsonViewHighlight
            )}
          >
            {value}
          </span>
        );
      })}
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
