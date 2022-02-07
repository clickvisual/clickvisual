import indexSearchBarStyles from "@/pages/DataLogs/components/RawLogsIndexes/IndexSearchBar/index.less";
import classNames from "classnames";
import { Input } from "antd";
import { useState } from "react";
import { useIntl } from "umi";
type IndexSearchBarProps = {
  onSearch: (val: string) => void;
};
const IndexSearchBar = (props: IndexSearchBarProps) => {
  const { onSearch } = props;
  const [value, setValue] = useState<string | undefined>();
  const i18n = useIntl();
  return (
    <div className={classNames(indexSearchBarStyles.indexSearchBarMain)}>
      <Input.Search
        value={value}
        placeholder={`${i18n.formatMessage({
          id: "log.index.search.placeholder",
        })}`}
        allowClear
        onSearch={onSearch}
        onChange={(ev) => setValue(ev.target.value)}
      />
    </div>
  );
};
export default IndexSearchBar;
