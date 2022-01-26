import classNames from "classnames";
import mangeIndexModalStyles from "@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal/index.less";
import { useIntl } from "umi";

const TableHeader = () => {
  const i18n = useIntl();
  return (
    <thead className={classNames(mangeIndexModalStyles.tableHeader)}>
      <tr>
        <th
          className={classNames(mangeIndexModalStyles.secondHeader)}
          rowSpan={2}
        >
          <span>
            {i18n.formatMessage({
              id: "log.index.manage.table.header.indexName",
            })}
          </span>
        </th>
        <th colSpan={2}>
          <span>
            {i18n.formatMessage({
              id: "log.index.manage.table.header.query",
            })}
          </span>
        </th>
        <th rowSpan={2}>
          <span>{i18n.formatMessage({ id: "operation" })}</span>
        </th>
      </tr>

      <tr className={classNames(mangeIndexModalStyles.tableHeader)}>
        <th className={classNames(mangeIndexModalStyles.secondHeader)}>
          <span>
            {i18n.formatMessage({
              id: "log.index.manage.table.header.indexType",
            })}
          </span>
        </th>
        <th className={classNames(mangeIndexModalStyles.secondHeader)}>
          <span>{i18n.formatMessage({ id: "description" })}</span>
        </th>
      </tr>
    </thead>
  );
};

export default TableHeader;
