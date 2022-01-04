import LoggingLibraryStyles from '@/pages/DataLogs/components/DataSourceMenu/LoggingLibrary/index.less';
import SearchLogLibrary from '@/pages/DataLogs/components/DataSourceMenu/SearchLogLibrary';
import LogLibraryList from '@/pages/DataLogs/components/DataSourceMenu/LogLibraryList';
import { useEffect, useState } from 'react';
import { useModel } from '@@/plugin-model/useModel';

type LoggingLibraryProps = {};
const LoggingLibrary = (props: LoggingLibraryProps) => {
  const { logLibraryList } = useModel('dataLogs');
  const [list, setList] = useState<string[]>([]);
  const onSearch = (val: string) => {
    setList(logLibraryList.filter((item) => item.toLowerCase().includes(val.toLowerCase())) || []);
  };

  useEffect(() => {
    setList(logLibraryList);
  }, [logLibraryList]);
  return (
    <div className={LoggingLibraryStyles.loggingLibraryMain}>
      <SearchLogLibrary onSearch={onSearch} />
      <LogLibraryList list={list} />
    </div>
  );
};
export default LoggingLibrary;
