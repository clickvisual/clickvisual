import indexSearchBarStyles from '@/pages/DataLogs/components/RawLogsIndexes/IndexSearchBar/index.less';
import classNames from 'classnames';
import { Input } from 'antd';
import { useState } from 'react';
type IndexSearchBarProps = {
  onSearch: (val: string) => void;
};
const IndexSearchBar = (props: IndexSearchBarProps) => {
  const { onSearch } = props;
  const [value, setValue] = useState<string | undefined>();
  return (
    <div className={classNames(indexSearchBarStyles.indexSearchBarMain)}>
      <Input.Search
        value={value}
        placeholder={'搜索索引'}
        allowClear
        onSearch={onSearch}
        onChange={(ev) => setValue(ev.target.value)}
      />
    </div>
  );
};
export default IndexSearchBar;
