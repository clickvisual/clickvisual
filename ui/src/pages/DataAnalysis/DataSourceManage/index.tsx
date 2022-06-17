import SearchBar from "@/pages/DataAnalysis/DataSourceManage/SearchBar";
import CreateAndUpdateModel from "@/pages/DataAnalysis/DataSourceManage/CreateAndUpdateModel";
import DataTable from "@/pages/DataAnalysis/DataSourceManage/DataTable";
const DataSourceManage = () => {
  return (
    <>
      <SearchBar />
      <DataTable />
      <CreateAndUpdateModel />
    </>
  );
};
export default DataSourceManage;
