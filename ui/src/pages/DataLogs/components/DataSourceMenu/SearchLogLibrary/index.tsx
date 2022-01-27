import searchLogLibraryStyles from "@/pages/DataLogs/components/DataSourceMenu/SearchLogLibrary/index.less";
import { Input } from "antd";
import { useEffect, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";

type SearchLogLibraryProps = {
  onSearch: (val: string) => void;
};

const SearchLogLibrary = (props: SearchLogLibraryProps) => {
  const { onSearch } = props;
  const { currentDatabase } = useModel("dataLogs");
  const [value, setValue] = useState<string | undefined>(undefined);
  const i18n = useIntl();

  useEffect(() => {
    return () => {
      setValue(undefined);
    };
  }, []);

  useEffect(() => {
    setValue(undefined);
  }, [currentDatabase]);

  return (
    <div className={searchLogLibraryStyles.searchLogLibraryMain}>
      <Input.Search
        value={value}
        placeholder={i18n.formatMessage({
          id: "datasource.logLibrary.search.placeholder",
        })}
        allowClear
        onSearch={onSearch}
        onChange={(ev) => setValue(ev.target.value)}
      />
    </div>
  );
};
export default SearchLogLibrary;
