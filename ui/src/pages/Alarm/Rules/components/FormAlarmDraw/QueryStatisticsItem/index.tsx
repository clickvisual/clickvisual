import queryStatisticsStyles from "@/pages/Alarm/Rules/components/FormAlarmDraw/QueryStatisticsItem/index.less";
import { Button, Form, FormInstance, Input, Space } from "antd";
import CreatedAndUpdatedModal from "@/pages/Alarm/Rules/components/FormAlarmDraw/QueryStatisticsItem/CreatedAndUpdatedModal";
import { useRef, useState } from "react";
import { FormListOperation } from "antd/es/form/FormList";
import { useIntl } from "umi";
import { PlusOutlined } from "@ant-design/icons";
import TriggerConditionItem from "../TriggerConditionItem";

const { TextArea } = Input;

const QueryStatisticsItem = (props: { formRef: FormInstance | null }) => {
  const i18n = useIntl();
  const statisticOptionRef = useRef<FormListOperation>();
  const insertIndex = useRef<number>();
  const [defaultData, setDefaultData] = useState<any>();
  const { formRef } = props;

  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [visibleModal, setVisibleModal] = useState<boolean>(false);

  const onChangeVisible = (visible: boolean) => {
    setVisibleModal(visible);
  };

  return (
    <Form.Item
      label={i18n.formatMessage({ id: "alarm.rules.form.associatedTable" })}
    >
      <Form.List
        name={"filters"}
        rules={[
          {
            validator: async (_: any, filters) => {
              if (!filters || filters.length < 1) {
                return Promise.reject(
                  new Error(
                    i18n.formatMessage({
                      id: "alarm.rules.form.inspectionStatistics.error",
                    })
                  )
                );
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        {(fields, options, { errors }) => {
          statisticOptionRef.current = options;
          return (
            <>
              {fields.map((field) => {
                const item =
                  formRef?.getFieldValue("filters") &&
                  formRef?.getFieldValue("filters").length > field.key &&
                  formRef?.getFieldValue("filters")[field.key];
                return (
                  <div
                    key={field.key}
                    className={queryStatisticsStyles.formLine}
                    style={{ height: "auto" }}
                  >
                    <div className={queryStatisticsStyles.item}>
                      <div className={queryStatisticsStyles.title}>
                        <span>
                          {i18n.formatMessage({
                            id: "datasource.logLibrary.from.tableName",
                          })}
                          : {item?.tableName || ""}
                        </span>
                        <a
                          onClick={() => {
                            insertIndex.current = field.name + 1;
                            onChangeVisible(true);
                          }}
                        >
                          <PlusOutlined />
                          {i18n.formatMessage({
                            id: "alarm.rules.form.addTable",
                          })}
                        </a>
                      </div>
                      <div style={{ display: "flex" }}>
                        <Form.Item
                          name={[field.name, "when"]}
                          required
                          label={i18n.formatMessage({
                            id: "alarm.rules.form.inspectionStatistics",
                          })}
                        >
                          <TextArea
                            autoSize={{ minRows: 1, maxRows: 15 }}
                            className={queryStatisticsStyles.whenItem}
                            style={{ width: "45vw" }}
                            disabled
                          />
                        </Form.Item>
                        {/* 0 default 1 INNER 2 LEFT OUTER 3 RIGHT OUTER 4 FULL OUTER 5 CROSS */}
                        <Form.Item
                          noStyle
                          hidden
                          name={[field.name, "typ"]}
                          initialValue={0}
                        >
                          <Input />
                        </Form.Item>
                        <Form.Item noStyle hidden name={[field.name, "exp"]}>
                          <Input />
                        </Form.Item>
                        <Form.Item noStyle>
                          <Space>
                            <a
                              onClick={() => {
                                const filtersList = {
                                  ...formRef?.getFieldValue("filters")[
                                    field.name
                                  ],
                                  fieldName: field.name,
                                };
                                setDefaultData(filtersList);
                                setIsEdit(true);
                                onChangeVisible(true);
                              }}
                            >
                              {i18n.formatMessage({ id: "edit" })}
                            </a>
                            <a onClick={() => options.remove(field.name)}>
                              {i18n.formatMessage({ id: "delete" })}
                            </a>
                          </Space>
                        </Form.Item>
                      </div>
                      <TriggerConditionItem field={field} />
                    </div>
                  </div>
                );
              })}
              {fields.length === 0 && (
                <Form.Item noStyle>
                  <Button
                    type="dashed"
                    onClick={() => onChangeVisible(true)}
                    block
                    icon={<PlusOutlined />}
                  >
                    {i18n.formatMessage({ id: "add" })}
                  </Button>
                  <Form.ErrorList
                    className={queryStatisticsStyles.lineError}
                    errors={errors}
                  />
                </Form.Item>
              )}
              <CreatedAndUpdatedModal
                visible={visibleModal}
                isEdit={isEdit}
                defaultData={defaultData}
                onOk={(fields: any) => {
                  if (!statisticOptionRef.current) return;
                  if (isEdit) {
                    let currentFiltersList = formRef?.getFieldValue("filters");
                    currentFiltersList.map((item: any, index: number) => {
                      if (index === fields?.fieldName) {
                        currentFiltersList[index] = fields;
                        formRef?.setFieldsValue({
                          filters: currentFiltersList,
                        });
                        return;
                      }
                    });
                  } else {
                    statisticOptionRef.current.add(
                      { ...fields, tid: fields.tableId },
                      insertIndex.current
                    );
                  }
                  setIsEdit(false);
                  setDefaultData({});
                  onChangeVisible(false);
                }}
                onCancel={() => {
                  setIsEdit(false);
                  setDefaultData({});
                  onChangeVisible(false);
                }}
              />
            </>
          );
        }}
      </Form.List>
    </Form.Item>
  );
};
export default QueryStatisticsItem;
