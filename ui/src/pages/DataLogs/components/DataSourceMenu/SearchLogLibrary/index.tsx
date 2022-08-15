import searchLogLibraryStyles from "@/pages/DataLogs/components/DataSourceMenu/SearchLogLibrary/index.less";
import { Input } from "antd";
import { useEffect, useState } from "react";
import { useIntl } from "umi";

type SearchLogLibraryProps = {
  onSearch: (val: string) => void;
  onGetList: any;
};

const SearchLogLibrary = (props: SearchLogLibraryProps) => {
  const { onSearch } = props;
  const [value, setValue] = useState<string | undefined>(undefined);
  const i18n = useIntl();

  useEffect(() => {
    return () => {
      setValue(undefined);
    };
  }, []);

  return (
    <div className={searchLogLibraryStyles.searchLogLibraryMain}>
      <div className={searchLogLibraryStyles.space}>
        <Input.Search
          value={value}
          placeholder={i18n.formatMessage({
            id: "datasource.logLibrary.search.placeholder",
          })}
          // allowClear
          style={{ flex: 1 }}
          onSearch={onSearch}
          onChange={(ev) => setValue(ev.target.value)}
        />
      </div>
    </div>
  );
};
export default SearchLogLibrary;
