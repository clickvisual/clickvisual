import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";

const SearchBarToolTip = () => {
  return (
    <div>
      <div className={searchBarStyles.tooltipTitle}>
        <span>查询：</span>
        <span>1. 指定字段查询：Method='Get' and Status='200'</span>
      </div>
      <div className={searchBarStyles.tooltipTitle}></div>
    </div>
  );
};
export default SearchBarToolTip;
