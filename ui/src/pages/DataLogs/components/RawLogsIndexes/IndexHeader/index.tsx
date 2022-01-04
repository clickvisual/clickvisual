import indexHeaderStyles from '@/pages/DataLogs/components/RawLogsIndexes/IndexHeader/index.less';
import IconFont from '@/components/IconFont';
import { Tooltip } from 'antd';
import { useModel } from '@@/plugin-model/useModel';
type IndexHeaderProps = {};
const IndexHeader = (props: IndexHeaderProps) => {
  const { onChangeVisibleIndexModal } = useModel('dataLogs');
  return (
    <div className={indexHeaderStyles.indexHeaderMain}>
      <span className={indexHeaderStyles.title}>索引列表</span>
      <div className={indexHeaderStyles.icon}>
        <Tooltip title={'索引管理'}>
          <IconFont
            onClick={() => {
              onChangeVisibleIndexModal(true);
            }}
            type={'icon-index'}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default IndexHeader;
