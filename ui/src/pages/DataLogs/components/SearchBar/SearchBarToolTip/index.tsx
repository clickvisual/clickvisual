import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";
import { useIntl } from "umi";

const SearchBarToolTip = () => {
  const i18n = useIntl();
  return (
    <div>
      <div className={searchBarStyles.tooltipTitle}>
        <span>{i18n.formatMessage({ id: "search" })}</span>
        <ul>
          <li>
            {i18n.formatMessage({ id: "log.search.help.content.specifyField" })}
          </li>
          <li>
            <a
              target="_Blank"
              href={i18n.formatMessage({
                id: "log.search.help.content.directionsUse.url",
              })}
            >
              {i18n.formatMessage({
                id: "log.search.help.content.directionsUse",
              })}
            </a>
          </li>
        </ul>
      </div>
      <div className={searchBarStyles.tooltipTitle} />
    </div>
  );
};
export default SearchBarToolTip;
