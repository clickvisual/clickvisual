import "@/components/JsonView/index.less";
import { createContext } from "react";
import FormatData from "@/components/JsonView/FormatData";

type JsonViewProps = {
  data: any;
  onClick: (key: string) => void;
};
type JsonViewContextType = {
  onClick: (key: string) => void;
};
export const JsonViewContext = createContext<JsonViewContextType>({
  onClick: (key: string) => {},
});
const JsonView = ({ data, onClick }: JsonViewProps) => {
  return (
    <JsonViewContext.Provider value={{ onClick }}>
      <FormatData data={data} />
    </JsonViewContext.Provider>
  );
};

export default JsonView;
