import logItemStyles from '@/pages/DataLogs/components/RawLogList/LogItem/index.less';
import { Tooltip } from 'antd';
import IconFont from '@/components/IconFont';
import { useModel } from '@@/plugin-model/useModel';
import { LogItemContext } from '@/pages/DataLogs/components/RawLogList';
import { useContext } from 'react';

type LogItemOperationProps = {};
const LogItemOperation = (props: LogItemOperationProps) => {
  const { onCopyRawLogDetails } = useModel('dataLogs');
  const { log } = useContext(LogItemContext);
  return (
    <div className={logItemStyles.operationLine}>
      <div className={logItemStyles.icon} onClick={() => onCopyRawLogDetails(log)}>
        <Tooltip title={'复制'} overlayInnerStyle={{ fontSize: 12 }}>
          <IconFont type={'icon-copy-link'} />
        </Tooltip>
      </div>
    </div>
  );
};

export default LogItemOperation;
