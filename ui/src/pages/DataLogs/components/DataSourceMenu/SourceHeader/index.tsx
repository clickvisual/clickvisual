import sourceHeaderStyles from '@/pages/DataLogs/components/DataSourceMenu/SourceHeader/index.less';
import { Button, Tooltip } from 'antd';
import { useModel } from '@@/plugin-model/useModel';

type SourceHeaderProps = {};
const SourceHeader = (props: SourceHeaderProps) => {
  const { currentDatabase, onChangeVisibleDatabaseDraw } = useModel('dataLogs');
  return (
    <div className={sourceHeaderStyles.sourceHeaderMain}>
      <div className={sourceHeaderStyles.sourceTitle}>
        {currentDatabase ? (
          <Tooltip title={currentDatabase.databaseName}>
            <span className={sourceHeaderStyles.titleContext}>{currentDatabase.databaseName}</span>
          </Tooltip>
        ) : (
          <span>暂未选择数据库</span>
        )}
      </div>
      <div className={sourceHeaderStyles.selectedBtn}>
        <Button onClick={() => onChangeVisibleDatabaseDraw(true)} type={'link'}>
          切换
        </Button>
      </div>
    </div>
  );
};
export default SourceHeader;
