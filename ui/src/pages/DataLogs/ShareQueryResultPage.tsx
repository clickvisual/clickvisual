import QueryResult from "@/pages/DataLogs/components/QueryResult";
import useLogUrlParams from "@/pages/DataLogs/hooks/useLogUrlParams";
import useUrlState from "@ahooksjs/use-url-state";

const ShareQueryResultPage = () => {
  const [urlState] = useUrlState();
  useLogUrlParams();
  return <QueryResult tid={urlState?.tid} />;
};
export default ShareQueryResultPage;
