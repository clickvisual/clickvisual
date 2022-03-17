import classNames from "classnames";
import mangeIndexModalStyles from "@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal/index.less";
import { FormInstance } from "antd";
import { FormListFieldData, FormListOperation } from "antd/es/form/FormList";
import IndexItem from "@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal/TableBody/IndexItem";

type TableBodyProps = {
  form: FormInstance;
  fields: FormListFieldData[];
  options: FormListOperation;
};
const TableBody = (props: TableBodyProps) => {
  const { fields, options, form } = props;

  return (
    <tbody className={classNames(mangeIndexModalStyles.tableBody)}>
      {fields.map((field, index) => (
        <IndexItem
          key={field.key}
          form={form}
          indexOptions={options}
          indexField={field}
          index={index}
        />
      ))}
    </tbody>
  );
};
export default TableBody;
