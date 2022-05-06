import { useState } from "react";

const useQueryType = () => {
  const [activeQueryType, setActiveQueryType] = useState<string>("rawLog");
  return {
    activeQueryType,
    setActiveQueryType,
  };
};
export default useQueryType;
