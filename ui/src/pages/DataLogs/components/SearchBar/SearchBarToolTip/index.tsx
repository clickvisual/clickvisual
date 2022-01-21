import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";

const SearchBarToolTip = () => {
  return (
    <div>
      <div className={searchBarStyles.tooltipTitle}>
        <span>Inquire：</span>
        <span>1. Specify the field query：Method='Get' and Status='200'</span>
      </div>
      <div className={searchBarStyles.tooltipTitle}></div>
    </div>
  );
};
export default SearchBarToolTip;
