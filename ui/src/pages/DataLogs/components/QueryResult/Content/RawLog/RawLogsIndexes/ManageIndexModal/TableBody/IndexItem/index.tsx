import classNames from "classnames";
import mangeIndexModalStyles
    from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal/index.less";
import {Button, Form, FormInstance, Input, Select} from "antd";
import {IndexInfoType} from "@/services/dataLogs";
import {CloseOutlined} from "@ant-design/icons";
import {FormListFieldData, FormListOperation} from "antd/es/form/FormList";
import {useIntl} from "umi";
import Index
    from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal/TableBody/JsonIndexItem";
import {hashType} from "@/models/datalogs/types";
import {
    ColSpan
} from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal/TableFooter";

const { Option } = Select;

export enum FieldType {
  String = 0,
  Int = 1,
  Float = 2,
  Json = 3,
}

// 0 text 1 long 2 double 3 json
export const typeList = [
  { value: FieldType.String, type: "String" },
  { value: FieldType.Int, type: "Int" },
  { value: FieldType.Float, type: "Float" },
  { value: FieldType.Json, type: "Json" },
];

// 0 text 1 long 2 double 3 json
export const hashList = [
  {
    value: hashType.noneSet,
    type: hashType.noneSet,
  },
  { value: hashType.siphash, type: "siphash" },
  { value: hashType.urlhash, type: "urlhash" },
];

type IndexItemProps = {
  form: FormInstance;
  indexOptions: FormListOperation;
  indexField: FormListFieldData;
  index: number;
};
const IndexItem = ({
  form,
  indexOptions,
  indexField,
  index,
}: IndexItemProps) => {
  const i18n = useIntl();

  return (
    <Form.Item
      noStyle
      shouldUpdate={(prevValues, nextValues) =>
        prevValues.data[indexField.name]?.typ !==
        nextValues.data[indexField.name]?.typ
      }
    >
      {({ getFieldValue, setFields }) => {
        const isJson =
          getFieldValue(["data", indexField.name, "typ"]) === FieldType.Json;
        const isString =
          getFieldValue(["data", indexField.name, "typ"]) === FieldType.String;
        return (
          <>
            <tr className={classNames(mangeIndexModalStyles.tableTr)}>
              <td
                className={classNames(isJson && mangeIndexModalStyles.jsonTd)}
              >
                <Form.Item
                  name={[indexField.name, "field"]}
                  rules={[
                    { required: true, message: "" },
                    {
                      validator: async (_, value) => {
                        const list = form
                          .getFieldValue(["data"])
                          ?.map((item: IndexInfoType) => item.field);
                        if (list.indexOf(value) < index) {
                          return Promise.reject();
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    placeholder={`${i18n.formatMessage({
                      id: "log.index.manage.placeholder.indexName",
                    })}`}
                  />
                </Form.Item>
              </td>
              <td
                className={classNames(isJson && mangeIndexModalStyles.jsonTd)}
              >
                <Form.Item noStyle name={[indexField.name, "typ"]}>
                  <Select
                    style={{ width: "100%" }}
                    onSelect={(value: number) => {
                      setFields([
                        {
                          name: ["data", indexField.name, "hashTyp"],
                          value: value == FieldType.String ? undefined : 0,
                        },
                      ]);
                      if (value !== FieldType.Json) return;
                      setFields([
                        {
                          name: ["data", indexField.name, "jsonIndex"],
                          value: [
                            {
                              typ: FieldType.String,
                              rootName: getFieldValue([
                                "data",
                                indexField.name,
                                "field",
                              ]),
                              alias: undefined,
                              hashTyp: hashType.noneSet,
                            },
                          ],
                        },
                      ]);
                    }}
                  >
                    {typeList.map((item) => (
                      <Option key={item.value} value={item.value}>
                        {item.type}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </td>
              <td
                className={classNames(isJson && mangeIndexModalStyles.jsonTd)}
              >
                {!isJson && (
                  <Form.Item noStyle name={[indexField.name, "alias"]}>
                    <Input
                      placeholder={`${i18n.formatMessage({
                        id: "log.index.manage.placeholder.alias",
                      })}`}
                    />
                  </Form.Item>
                )}
              </td>
              <td
                className={classNames(isJson && mangeIndexModalStyles.jsonTd)}
              >
                <Form.Item
                  shouldUpdate={(prevValues, nextValues) =>
                    prevValues.typ !== nextValues.typ
                  }
                  noStyle
                >
                  {() => {
                    return !isJson ? (
                      <Form.Item noStyle name={[indexField.name, "hashTyp"]}>
                        <Select
                          style={{ width: "80%" }}
                          allowClear
                          disabled={!isString}
                        >
                          {hashList
                            // .filter((item: any) =>
                            //   isString ? item.value != 0 : item.value == 0
                            // )
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
                    ) : null;
                  }}
                </Form.Item>
              </td>
              <td
                className={classNames(isJson && mangeIndexModalStyles.jsonTd)}
              >
                <Button
                  onClick={() => indexOptions.remove(indexField.name)}
                  type="primary"
                  danger
                  icon={<CloseOutlined />}
                >
                  {i18n.formatMessage({
                    id: "log.index.manage.button.deleted",
                  })}
                </Button>
              </td>
            </tr>
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, nextValues) =>
                prevValues.data[indexField.name]?.typ !==
                nextValues.data[indexField.name]?.typ
              }
            >
              {() => {
                if (!isJson) return <></>;
                return (
                  <tr>
                    <td
                      colSpan={ColSpan}
                      className={mangeIndexModalStyles.jsonChildTd}
                    >
                      <Form.List name={[indexField.name, "jsonIndex"]}>
                        {(fields, options) => {
                          return (
                            <>
                              {fields.map((field, jsonIndex: number) => {
                                return (
                                  <Form.Item key={field.key} noStyle>
                                    <Index
                                      fields={fields}
                                      field={field}
                                      index={jsonIndex}
                                      indexField={indexField}
                                      options={options}
                                      form={form}
                                      rootName={getFieldValue([
                                        "data",
                                        indexField.name,
                                        "field",
                                      ])}
                                    />
                                  </Form.Item>
                                );
                              })}
                            </>
                          );
                        }}
                      </Form.List>
                    </td>
                  </tr>
                );
              }}
            </Form.Item>
          </>
        );
      }}
    </Form.Item>
  );
};
export default IndexItem;
