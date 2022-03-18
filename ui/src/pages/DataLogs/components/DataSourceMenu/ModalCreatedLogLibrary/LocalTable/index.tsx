import { useIntl } from "umi";
import { Select, Form, Empty, Cascader, FormInstance, Table } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { InstanceType } from "@/services/systemSetting";
import { LocalTables, TableColumn } from "@/services/dataLogs";
import { useState } from "react";

const { Option } = Select;

type LocalTableProps = {
  formRef: FormInstance | null;
};
const LocalTable = ({ formRef }: LocalTableProps) => {
  const i18n = useIntl();
  const { getLocalTables, getTableColumns } = useModel("dataLogs");
  const { instanceList } = useModel("instances");
  const [options, setOptions] = useState<any[]>([]);
  const [allColumns, setAllColumns] = useState<TableColumn[]>([]);
  const [conformToStandard, setConformToStandard] = useState<TableColumn[]>([]);

  const formatOptions = (list: LocalTables[]) => {
    setOptions(
      list?.map((item) => ({
        value: item.name,
        label: item.name,
        children:
          item?.tables?.map((table) => ({
            value: table.name,
            label: table.name,
          })) || [],
      })) || []
    );
  };

  return (
    <>
      <Form.Item
        label={i18n.formatMessage({ id: "datasource.draw.table.instance" })}
        name={"instance"}
      >
        <Select
          placeholder={`${i18n.formatMessage({
            id: "datasource.draw.selected",
          })}`}
          onChange={(val) => {
            if (!val) return;
            formRef?.resetFields(["localTables"]);
            getLocalTables.run(val as number).then((res) => {
              if (res?.code !== 0) return;
              formatOptions(res.data);
            });
          }}
        >
          {instanceList.map((item: InstanceType, index: number) => (
            <Option key={index} value={item.id as number}>
              {item.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, nextValues) =>
          prevValues.instance !== nextValues.instance
        }
      >
        {({ getFieldValue }) => {
          const instanceFlag = !!getFieldValue("instance");
          return (
            <>
              <Form.Item
                label={`${i18n.formatMessage({
                  id: "instance.datasource",
                })}/${i18n.formatMessage({
                  id: "alarm.rules.inspectionFrequency.selectOption.logLibrary",
                })}`}
                name={"localTables"}
              >
                <Cascader
                  showSearch
                  options={options}
                  expandTrigger="hover"
                  placeholder={`${i18n.formatMessage({
                    id: "alarm.rules.selected.placeholder.database",
                  })}`}
                  onChange={(values: any[]) => {
                    if (!values || values.length !== 2) return;
                    formRef?.resetFields(["timeField"]);
                    getTableColumns
                      .run(getFieldValue(["instance"]), {
                        databaseName: values[0],
                        tableName: values[1],
                      })
                      .then((res) => {
                        if (res?.code !== 0) return;
                        setAllColumns(res.data.all);
                        setConformToStandard(res.data.conformToStandard);
                      });
                  }}
                  disabled={!instanceFlag}
                />
              </Form.Item>
            </>
          );
        }}
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, nextValues) =>
          prevValues.tableName !== nextValues.tableName
        }
      >
        {({ getFieldValue }) => {
          const table =
            !!getFieldValue("localTables") &&
            getFieldValue("localTables").length === 2;
          if (!table)
            return (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={i18n.formatMessage({
                  id: "alarm.rules.selected.placeholder.logLibrary",
                })}
              />
            );
          return (
            <>
              <Form.Item
                label={i18n.formatMessage({
                  id: "datasource.logLibrary.from.newLogLibrary.timeResolutionField",
                })}
                name={"timeField"}
              >
                <Select
                  placeholder={i18n.formatMessage({
                    id: "datasource.logLibrary.from.newLogLibrary.timeResolutionField.placeholder",
                  })}
                >
                  {conformToStandard.map((item) => (
                    <Option key={item.name} value={item.name}>
                      {item.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                label={i18n.formatMessage({
                  id: "datasource.logLibrary.from.newLogLibrary.fieldsInTheTable",
                })}
              >
                <Table
                  size={"small"}
                  loading={getTableColumns.loading}
                  columns={[{ title: "Column", dataIndex: "name" }]}
                  dataSource={allColumns}
                  scroll={{ y: 200 }}
                  pagination={false}
                />
              </Form.Item>
            </>
          );
        }}
      </Form.Item>
    </>
  );
};
export default LocalTable;
