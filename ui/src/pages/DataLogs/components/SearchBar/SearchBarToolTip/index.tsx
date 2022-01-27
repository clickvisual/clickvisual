import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";
import { useIntl } from "umi";

const SearchBarToolTip = () => {
  const i18n = useIntl();
  return (
    <div>
      <div className={searchBarStyles.tooltipTitle}>
        <span>
          {i18n.formatMessage({ id: "log.search.help.title.inquire" })}
        </span>
        <ul>
          <li>
            {i18n.formatMessage({ id: "log.search.help.content.specifyField" })}
          </li>
        </ul>
      </div>
      <div className={searchBarStyles.tooltipTitle} />
    </div>
  );
};
export default SearchBarToolTip;
