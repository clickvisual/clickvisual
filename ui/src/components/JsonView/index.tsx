import "@/components/JsonView/index.less";
import JsonData from "@/components/JsonView/JsonData";

type JsonViewProps = {
  data: any;
  hierarchy: number;
} & _CommonProps;

const JsonView = (props: JsonViewProps) => {
  return <JsonData {...props} />;
};

export default JsonView;
