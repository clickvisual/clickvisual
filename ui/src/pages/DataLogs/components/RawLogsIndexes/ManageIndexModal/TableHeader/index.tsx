import classNames from 'classnames';
import mangeIndexModalStyles from '@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal/index.less';

const TableHeader = () => {
  return (
    <thead className={classNames(mangeIndexModalStyles.tableHeader)}>
      <tr>
        <th className={classNames(mangeIndexModalStyles.secondHeader)} rowSpan={2}>
          <span>索引名称</span>
        </th>
        <th colSpan={2}>
          <span>开启查询</span>
        </th>
        <th rowSpan={2}>
          <span>操作</span>
        </th>
      </tr>

      <tr className={classNames(mangeIndexModalStyles.tableHeader)}>
        <th className={classNames(mangeIndexModalStyles.secondHeader)}>
          <span>索引类型</span>
        </th>
        <th className={classNames(mangeIndexModalStyles.secondHeader)}>
          <span>别名</span>
        </th>
      </tr>
    </thead>
  );
};

export default TableHeader;
