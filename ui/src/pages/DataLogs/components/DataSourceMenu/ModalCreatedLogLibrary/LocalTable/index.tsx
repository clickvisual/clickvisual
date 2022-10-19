import { useIntl } from "umi";
import {
  Select,
  Form,
  Empty,
  Cascader,
  FormInstance,
  Table,
  Radio,
  Collapse,
  Input,
} from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { InstanceType } from "@/services/systemSetting";
import { LocalTables } from "@/services/dataLogs";
import { useState } from "react";

const { Option } = Select;
const { TextArea } = Input;

type LocalTableProps = {
  formRef: FormInstance | null;
  onChangeIsCluster: (flag: boolean) => void;
  isCluster: boolean;
};
const LocalTable = ({
  formRef,
  onChangeIsCluster,
  isCluster,
}: LocalTableProps) => {
  const i18n = useIntl();
  const {
    getLocalTables,
    getTableColumns,
    addLogToDatabase,
    isLogLibraryAllDatabase,
  } = useModel("dataLogs");
  const { instanceList } = useModel("instances");
  const [options, setOptions] = useState<any[]>([]);
  const [columnsItemList, setColumnsItemList] = useState<any[]>([]);
  const [currentInstance, setCurrentInstance] = useState<any>();

  const { Panel } = Collapse;

  const formatOptions = (list: LocalTables[]) => {
    let newList: any = list;
    // 从已有数据库新增
    if (!isLogLibraryAllDatabase) {
      const currentDatabaseName = addLogToDatabase?.name;
      const newArr = [
        list.find((item: any) => {
          return item.name == currentDatabaseName;
        }),
      ];
      newList = newArr[0] ? newArr : list;
    }
    setOptions(
      newList.map((item: any) => {
        return {
          value: item.name,
          label: item.name,
          disabled: !item?.tables,
          children:
            item?.tables?.map((table: any) => ({
              value: table.name,
              label: table.name,
            })) || [],
        };
      }) || []
    );
  };

  const setValueArr = (values: any, instanceValue: any) => {
    let flag: number = 0;
    values.map(async (item: any, index: number) => {
      if (item.length != 2) {
        flag++;
      }
      let valueArr: any[] = [];
      values.map((value: any) => {
        if (value.length == 2) {
          valueArr.push({
            databaseName: value[0],
            tableName: value[1],
          });
        }
      });
      formRef?.setFields([
        {
          name: "tableList",
          value: valueArr,
        },
      ]);
      if (item.length != 2) return;
      const res = await getTableColumns.run(instanceValue, {
        databaseName: item[0],
        tableName: item[1],
      });
      if (res?.code !== 0) return;
      res.data.index = index - flag;
      setColumnsItemList((oldValue) => {
        const newValue = [...oldValue, res.data];
        return newValue;
      });
    });
  };

  // useEffect(() => {
  //   if (instanceList.length <= 0) return;
  //   const instanceObj = instanceList.find(
  //     (item: any) =>
  //       item.name == (addLogToDatabase?.instanceName || instanceName)
  //   );
  //   if (!instanceObj || !instanceObj.id) return;
  //   formRef?.setFieldsValue({
  //     instance: instanceObj.id,
  //   });
  //   getLocalTables.run(instanceObj.id as number).then((res) => {
  //     if (res?.code !== 0) return;
  //     formatOptions(res.data);
  //   });
  // }, [instanceList]);

  // useEffect(() => {
  //   if (!options || !(addLogToDatabase?.name || databaseName) || !instanceList)
  //     return;
  //   const currentDatabaseName = addLogToDatabase?.name || databaseName;
  //   const instanceObj = instanceList.find(
  //     (item: any) =>
  //       item.name == (addLogToDatabase?.instanceName || instanceName)
  //   );
  //   const arr: any = options.filter((items: any) => {
  //     return items.value == currentDatabaseName;
  //   })[0];
  //   const values: any[] = [[currentDatabaseName]];
  //   // 填充子项
  //   arr?.children.map((items: any) => {
  //     values.push([currentDatabaseName, items.value]);
  //   });
  //   if (values.length == 0) return;
  //   setValueArr(values, instanceObj?.id);
  //   formRef?.setFieldsValue({
  //     localTables: values,
  //   });
  // }, [addLogToDatabase, options]);

  return (
    <>
      <Form.Item
        label={i18n.formatMessage({ id: "datasource.draw.table.instance" })}
        name={"instance"}
        rules={[
          {
            required: true,
            message: i18n.formatMessage({
              id: "datasource.draw.selected",
            }),
          },
        ]}
      >
        <Select
          placeholder={`${i18n.formatMessage({
            id: "datasource.draw.selected",
          })}`}
          onChange={(val) => {
            if (!val) return;
            onChangeIsCluster(false);
            instanceList.map((item: any) => {
              if (item.id == val && item.mode == 1) {
                setCurrentInstance(item);
                onChangeIsCluster(true);
                return;
              }
            });
            formRef?.resetFields(["localTables"]);
            getLocalTables.run(val as number).then((res) => {
              if (res?.code !== 0) return;
              formatOptions(res.data);
            });
          }}
        >
          {instanceList.map((item: InstanceType) => (
            <Option key={item.id} value={item.id as number}>
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
                rules={[
                  {
                    required: true,
                    message: i18n.formatMessage({
                      id: "alarm.rules.selected.placeholder.database",
                    }),
                  },
                ]}
              >
                <Cascader
                  showSearch
                  options={options}
                  multiple
                  expandTrigger="hover"
                  placeholder={`${i18n.formatMessage({
                    id: "alarm.rules.selected.placeholder.database",
                  })}`}
                  onChange={(values: any[]) => {
                    formRef?.resetFields(["timeField"]);
                    setColumnsItemList([]);
                    if (!values || values.length <= 0) return;
                    values.map(async (item: any) => {
                      if (!item) {
                        return;
                      } else if (item.length == 1) {
                        /**
                         * 填充子项
                         */
                        const arr: any = options.filter((items: any) => {
                          return items.value == item[0];
                        })[0];
                        arr?.children.map((items: any) => {
                          values.push([item[0], items.value]);
                        });
                      }
                    });
                    setValueArr(values, getFieldValue(["instance"]));
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
        shouldUpdate={(pre, next) => pre.instance != next.instance}
      >
        {() => {
          return (
            isCluster && (
              <Form.Item
                label={i18n.formatMessage({
                  id: "instance.form.title.cluster",
                })}
                name="cluster"
                rules={[
                  {
                    required: true,
                    message: i18n.formatMessage({
                      id: "config.selectedBar.cluster",
                    }),
                  },
                ]}
              >
                <Select
                  placeholder={`${i18n.formatMessage({
                    id: "config.selectedBar.cluster",
                  })}`}
                >
                  {currentInstance?.clusters.map((item: string) => (
                    <Option key={item} value={item}>
                      {item}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )
          );
        }}
      </Form.Item>
      <Form.Item
        label={i18n.formatMessage({
          id: "datasource.tooltip.icon.info",
        })}
        required
        shouldUpdate={(prevValues, nextValues) =>
          prevValues.tableName !== nextValues.tableName ||
          prevValues.tableList !== nextValues.tableList
        }
      >
        {({ getFieldValue }) => {
          const table = getFieldValue("localTables")?.length > 0;
          if (!table) {
            return (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={i18n.formatMessage({
                  id: "alarm.rules.selected.placeholder.logLibrary",
                })}
              />
            );
          }
          return (
            <Form.List name="tableList">
              {(fields) => {
                return (
                  <>
                    {fields.map((field) => {
                      const item =
                        formRef?.getFieldValue("tableList")[field.key];
                      const items: any = columnsItemList.filter((item: any) => {
                        return item.index == field.key;
                      })[0];
                      return (
                        <Collapse
                          defaultActiveKey={[field.key]}
                          style={{ marginBottom: "10px" }}
                          key={field.key}
                        >
                          <Panel
                            header={`${item.databaseName}-${item.tableName}`}
                            forceRender
                            key={field.key}
                          >
                            <Form.Item
                              {...field}
                              label={i18n.formatMessage({
                                id: "datasource.logLibrary.from.newLogLibrary.timeResolutionField",
                              })}
                              name={[field.name, "timeField"]}
                              fieldKey={[field.key, "timeField"]}
                              rules={[
                                {
                                  required: true,
                                  message: i18n.formatMessage({
                                    id: "datasource.logLibrary.from.newLogLibrary.timeResolutionField.placeholder",
                                  }),
                                },
                              ]}
                            >
                              <Select
                                placeholder={`${i18n.formatMessage({
                                  id: "datasource.logLibrary.from.newLogLibrary.timeResolutionField.placeholder",
                                })}`}
                              >
                                {items?.conformToStandard.map((item: any) => (
                                  <Option key={item.name} value={item.name}>
                                    {item.name}
                                  </Option>
                                ))}
                              </Select>
                            </Form.Item>
                            <Form.Item
                              noStyle
                              shouldUpdate={(prevValues, nextValues) =>
                                prevValues.timeField !== nextValues.timeField
                              }
                            >
                              {({ getFieldValue }) => {
                                const timeField =
                                  getFieldValue("tableList")[field.name]
                                    .timeField;
                                const selectedField =
                                  items?.conformToStandard.find(
                                    (item: any) => item.name === timeField
                                  );

                                switch (selectedField?.type) {
                                  case -1:
                                    return (
                                      <Form.Item
                                        name={[field.name, "timeFieldType"]}
                                        fieldKey={[field.key, "timeFieldType"]}
                                        label={i18n.formatMessage({
                                          id: "datasource.logLibrary.from.newLogLibrary.timeFieldType",
                                        })}
                                        rules={[
                                          {
                                            required: true,
                                            message: i18n.formatMessage({
                                              id: "datasource.logLibrary.from.newLogLibrary.rule.timeResolutionFieldType",
                                            }),
                                          },
                                        ]}
                                      >
                                        <Radio.Group>
                                          <Radio value={0}>DateTime</Radio>
                                        </Radio.Group>
                                      </Form.Item>
                                    );
                                  case -2:
                                    return (
                                      <Form.Item
                                        name={[field.name, "timeFieldType"]}
                                        fieldKey={[field.key, "timeFieldType"]}
                                        label={i18n.formatMessage({
                                          id: "datasource.logLibrary.from.newLogLibrary.timeFieldType",
                                        })}
                                        rules={[
                                          {
                                            required: true,
                                            message: i18n.formatMessage({
                                              id: "datasource.logLibrary.from.newLogLibrary.rule.timeResolutionFieldType",
                                            }),
                                          },
                                        ]}
                                      >
                                        <Radio.Group>
                                          <Radio value={3}>DateTime64(3)</Radio>
                                        </Radio.Group>
                                      </Form.Item>
                                    );
                                  case 1:
                                  case 4:
                                    return (
                                      <Form.Item
                                        name={[field.name, "timeFieldType"]}
                                        fieldKey={[field.key, "timeFieldType"]}
                                        label={i18n.formatMessage({
                                          id: "datasource.logLibrary.from.newLogLibrary.timeFieldType",
                                        })}
                                        rules={[
                                          {
                                            required: true,
                                            message: i18n.formatMessage({
                                              id: "datasource.logLibrary.from.newLogLibrary.rule.timeResolutionFieldType",
                                            }),
                                          },
                                        ]}
                                      >
                                        <Radio.Group>
                                          <Radio value={1}>
                                            {i18n.formatMessage({
                                              id: "datasource.logLibrary.from.newLogLibrary.timeType.seconds",
                                            })}
                                          </Radio>
                                          <Radio value={2}>
                                            {i18n.formatMessage({
                                              id: "datasource.logLibrary.from.newLogLibrary.timeType.millisecond",
                                            })}
                                          </Radio>
                                        </Radio.Group>
                                      </Form.Item>
                                    );
                                  default:
                                    return <></>;
                                }
                              }}
                            </Form.Item>
                            <Form.Item
                              label={i18n.formatMessage({
                                id: "datasource.logLibrary.from.newLogLibrary.fieldsInTheTable",
                              })}
                            >
                              <Table
                                size={"small"}
                                loading={getTableColumns.loading}
                                columns={[
                                  {
                                    title: "Column",
                                    dataIndex: "name",
                                  },
                                ]}
                                dataSource={items?.all}
                                scroll={{ y: 200 }}
                                pagination={false}
                              />
                            </Form.Item>
                            <Form.Item
                              label={i18n.formatMessage({
                                id: "description",
                              })}
                              name={[field.name, "desc"]}
                              fieldKey={[field.key, "desc"]}
                            >
                              <TextArea
                                rows={3}
                                placeholder={i18n.formatMessage({
                                  id: "datasource.logLibrary.from.newLogLibrary.desc.placeholder",
                                })}
                              ></TextArea>
                            </Form.Item>
                          </Panel>
                        </Collapse>
                      );
                    })}
                  </>
                );
              }}
            </Form.List>
          );
        }}
      </Form.Item>
    </>
  );
};
export default LocalTable;
