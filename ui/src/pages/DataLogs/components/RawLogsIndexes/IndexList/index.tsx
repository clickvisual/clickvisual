import indexListStyles from '@/pages/DataLogs/components/RawLogsIndexes/IndexList/index.less';
import classNames from 'classnames';
import { Empty, Tooltip } from 'antd';
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import IndexItem from '@/pages/DataLogs/components/RawLogsIndexes/IndexItem';

type IndexListProps = {
  list: string[];
};
const IndexList = (props: IndexListProps) => {
  const [activeList, setActiveList] = useState<string[]>([]);
  const { list } = props;
  useEffect(() => {
    setActiveList([]);
  }, [list]);
  return (
    <div className={classNames(indexListStyles.indexListMain)}>
      {list.length > 0 ? (
        <ul>
          {list.map((index) => {
            const isActive = activeList.indexOf(index) > -1;
            return (
              <div className={classNames(indexListStyles.indexRowMain)} key={index}>
                <Tooltip title={index} placement={'left'}>
                  <li
                    className={classNames(
                      indexListStyles.indexRow,
                      isActive && indexListStyles.activeIndexRow,
                    )}
                    onClick={() => {
                      if (activeList.indexOf(index) === -1) {
                        setActiveList(() => [...activeList, index]);
                      } else {
                        setActiveList(() =>
                          activeList.filter((itemActive) => itemActive !== index),
                        );
                      }
                    }}
                  >
                    <span className={indexListStyles.title}>{index}</span>
                    <div className={indexListStyles.icon}>
                      {isActive ? <CaretUpOutlined /> : <CaretDownOutlined />}
                    </div>
                  </li>
                </Tooltip>
                {isActive && <IndexItem index={index} isActive={isActive} />}
              </div>
            );
          })}
        </ul>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={'暂未创建索引'} />
      )}
    </div>
  );
};
export default IndexList;
