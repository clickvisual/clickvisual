import searchLogLibraryStyles from '@/pages/DataLogs/components/DataSourceMenu/SearchLogLibrary/index.less';
import { Input } from 'antd';
import { useEffect, useState } from 'react';
import { useModel } from '@@/plugin-model/useModel';

type SearchLogLibraryProps = {
  onSearch: (val: string) => void;
};

const SearchLogLibrary = (props: SearchLogLibraryProps) => {
  const { onSearch } = props;
  const { currentDatabase } = useModel('dataLogs');
  const [value, setValue] = useState<string | undefined>(undefined);

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
        placeholder={'搜索 log library'}
        allowClear
        onSearch={onSearch}
        onChange={(ev) => setValue(ev.target.value)}
      />
    </div>
  );
};
export default SearchLogLibrary;
