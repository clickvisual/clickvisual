import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";
import { QueryTypeEnum } from "@/config/config";
import TableQuery from "@/pages/DataLogs/components/SearchBar/TableQuery";
import RawLogQuery from "@/pages/DataLogs/components/SearchBar/RawLogQuery";
import { useModel } from "@@/plugin-model/useModel";

const SearchBar = () => {
  const { queryTypeHelper } = useModel("dataLogs");
  const { activeQueryType } = queryTypeHelper;

  const SearchQuery = () => {
    switch (activeQueryType) {
      case QueryTypeEnum.LOG:
        return <RawLogQuery />;
      case QueryTypeEnum.TABLE:
        return <TableQuery />;
      default:
        return <RawLogQuery />;
    }
  };
  return (
    <div className={searchBarStyles.searchBarMain}>
      <SearchQuery />
    </div>
  );
};

export default SearchBar;
