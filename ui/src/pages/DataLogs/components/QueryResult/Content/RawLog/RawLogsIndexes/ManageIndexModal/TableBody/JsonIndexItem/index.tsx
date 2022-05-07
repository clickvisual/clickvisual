import classNames from "classnames";
import mangeIndexModalStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal/index.less";
import { Form, FormInstance, Input, Select, Space } from "antd";
import { FormListFieldData, FormListOperation } from "antd/es/form/FormList";
import {
  FieldType,
  typeList,
  hashList,
} from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal/TableBody/IndexItem";
import { IndexInfoType } from "@/services/dataLogs";
import { useIntl } from "umi";
import { MinusCircleOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";

const { Option } = Select;

type JsonIndexItemProps = {
  form: FormInstance;
  index: number;
  field: FormListFieldData;
  fields: FormListFieldData[];
  indexField: FormListFieldData;
  options: FormListOperation;
  rootName: string;
};

const Index = ({
  form,
  field,
  fields,
  options,
  index,
  indexField,
  rootName,
}: JsonIndexItemProps) => {
  const [isString, setIsString] = useState<boolean>(true);
  const i18n = useIntl();
  useEffect(() => {
    setIsString(
      form.getFieldValue([
        "data",
        indexField.name,
        "jsonIndex",
        field.key,
        "typ",
      ]) == FieldType.String
    );
  }, []);
  return (
    <div className={classNames(mangeIndexModalStyles.isJsonDiv)}>
      <Space style={{ width: "100%" }}>
        <Form.Item
          name={[field.name, "field"]}
          rules={[
            { required: true, message: "" },
            {
              validator: async (_, value) => {
                const list = form
                  .getFieldValue(["data", indexField.name, "jsonIndex"])
                  ?.map((item: IndexInfoType) => item.field);
                const indexList = form
                  .getFieldValue(["data"])
                  ?.filter((item: IndexInfoType) => item.typ !== FieldType.Json)
                  ?.map((item: IndexInfoType) => item.field);
                if (
                  list.indexOf(value) < index ||
                  indexList.indexOf(value) > -1
                ) {
                  return Promise.reject();
                }

                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            style={{ width: 200 }}
            placeholder={`${i18n.formatMessage({
              id: "log.index.manage.placeholder.indexName",
            })}`}
          />
        </Form.Item>
        <Form.Item noStyle name={[field.name, "typ"]}>
          <Select
            style={{ width: 180 }}
            onChange={(value) => {
              setIsString(value == FieldType.String);
              form.setFields([
                {
                  name: [
                    "data",
                    indexField.name,
                    "jsonIndex",
                    field.name,
                    "hashTyp",
                  ],
                  value: value == FieldType.String ? undefined : 0,
                },
              ]);
            }}
          >
            {typeList
              .filter((item) => item.value !== 3)
              .map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.type}
                </Option>
              ))}
          </Select>
        </Form.Item>
        <Form.Item noStyle name={[field.name, "alias"]}>
          <Input
            style={{ width: 180 }}
            placeholder={`${i18n.formatMessage({
              id: "log.index.manage.placeholder.alias",
            })}`}
          />
        </Form.Item>
        <Form.Item noStyle name={[field.name, "hashTyp"]}>
          <Select style={{ width: 140 }} allowClear disabled={!isString}>
            {hashList
              .filter((item: any) =>
                isString ? item.value != 0 : item.value == 0
              )
              .map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.type ||
                    i18n.formatMessage({
                      id: "log.index.manage.enum.zero",
                    })}
                </Option>
              ))}
          </Select>
        </Form.Item>
        <Form.Item noStyle>
          <Space>
            <PlusCircleOutlined
              onClick={() =>
                options.add({
                  typ: FieldType.String,
                  rootName: rootName,
                  alias: undefined,
                })
              }
            />
            {fields.length > 1 && (
              <MinusCircleOutlined onClick={() => options.remove(field.name)} />
            )}
          </Space>
        </Form.Item>
      </Space>
    </div>
  );
};
export default Index;
