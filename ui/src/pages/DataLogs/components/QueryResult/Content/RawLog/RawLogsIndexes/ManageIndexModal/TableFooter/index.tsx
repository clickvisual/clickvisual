import { FormListOperation } from "antd/es/form/FormList";
import mangeIndexModalStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal/index.less";
import { Button } from "antd";
import { PlusCircleOutlined } from "@ant-design/icons";
import { useIntl } from "umi";
import { hashType } from "@/models/datalogs/types";

type TableFooterProps = {
  options: FormListOperation;
};

export const ColSpan = 5;

const TableFooter = (props: TableFooterProps) => {
  const i18n = useIntl();
  const { options } = props;
  return (
    <tfoot className={mangeIndexModalStyles.tableFooter}>
      <tr className={mangeIndexModalStyles.tableTr}>
        <td colSpan={ColSpan}>
          <div className={mangeIndexModalStyles.context}>
            <div className={mangeIndexModalStyles.operationBtn}>
              <Button
                onClick={() =>
                  options.add({ typ: 0, hashTyp: hashType.noneSet })
                }
                type={"primary"}
                icon={<PlusCircleOutlined />}
              >
                {i18n.formatMessage({ id: "log.index.manage.button.created" })}
              </Button>
            </div>
          </div>
        </td>
      </tr>
    </tfoot>
  );
};
export default TableFooter;
