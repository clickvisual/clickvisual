import QueryResult from "@/pages/DataLogs/components/QueryResult";
import useLogUrlParams from "@/pages/DataLogs/hooks/useLogUrlParams";

const ShareQueryResultPage = () => {
  useLogUrlParams();
  return <QueryResult />;
};
export default ShareQueryResultPage;
