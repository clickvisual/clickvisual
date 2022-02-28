import conditionStyles from "@/pages/Alarm/Rules/components/FormAlarmDraw/TriggerConditionItem/index.less";
import { Button, Form, InputNumber, Select, Space } from "antd";
import { useIntl } from "umi";
import classNames from "classnames";
import { PlusOutlined } from "@ant-design/icons";

const { Option } = Select;

const TriggerConditionItem = () => {
  const i18n = useIntl();

  const typList = [
    { key: 0, label: "WHEN" },
    { key: 1, label: "AND" },
    { key: 2, label: "OR" },
  ];

  const expList = [
    { key: 0, label: "avg()" },
    { key: 1, label: "min()" },
    { key: 2, label: "max()" },
    { key: 3, label: "sum()" },
    { key: 4, label: "count()" },
  ];

  const condList = [
    { key: 0, label: "above" },
    { key: 1, label: "below" },
    { key: 2, label: "outside range" },
    { key: 3, label: "within range" },
  ];

  return (
    <Form.Item
      required
      label={i18n.formatMessage({ id: "alarm.form.triggerCondition" })}
    >
      <Form.List
        name={"conditions"}
        rules={[
          {
            validator: async (_: any, conditions) => {
              if (!conditions || conditions.length < 1) {
                return Promise.reject(
                  new Error(
                    i18n.formatMessage({
                      id: "alarm.form.triggerCondition.error",
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
          return (
            <div className={conditionStyles.conditionsMain}>
              {fields.map((field) => {
                const isFistCondition = field.name === 0;
                return (
                  <Space
                    key={`${field.key}-conditions`}
                    className={conditionStyles.fieldLine}
                  >
                    <Form.Item
                      noStyle
                      shouldUpdate={(prevValues, nextValues) =>
                        prevValues.conditions.length !==
                        nextValues.conditions.length
                      }
                    >
                      <Form.Item noStyle name={[field.name, "typ"]}>
                        <Select
                          className={classNames(conditionStyles.selectItem)}
                          disabled={isFistCondition}
                        >
                          {typList
                            .filter((item) =>
                              isFistCondition ? item.key === 0 : item.key !== 0
                            )
                            .map((item) => (
                              <Option key={`${item.key}-typ`} value={item.key}>
                                {item.label}
                              </Option>
                            ))}
                        </Select>
                      </Form.Item>
                    </Form.Item>
                    <Form.Item noStyle name={[field.name, "exp"]}>
                      <Select
                        className={classNames(conditionStyles.selectItem)}
                      >
                        {expList.map((item) => (
                          <Option key={`${item.key}-exp`} value={item.key}>
                            {item.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item noStyle name={[field.name, "cond"]}>
                      <Select
                        className={classNames(conditionStyles.selectCond)}
                      >
                        {condList.map((item) => (
                          <Option key={`${item.key}-cond`} value={item.key}>
                            {item.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      noStyle
                      shouldUpdate={(prevValues, nextValues) =>
                        prevValues.conditions[field.name]?.cond !==
                        nextValues.conditions[field.name]?.cond
                      }
                    >
                      {({ getFieldValue }) => {
                        const condFlag =
                          getFieldValue(["conditions", field.name, "cond"]) > 1;

                        return (
                          <Space>
                            <Form.Item
                              className={conditionStyles.formItemMargin}
                              style={{ margin: 0 }}
                              name={[field.name, "val1"]}
                              rules={[
                                {
                                  required: true,
                                  message: i18n.formatMessage({
                                    id: "required",
                                  }),
                                },
                              ]}
                            >
                              <InputNumber
                                placeholder={`${i18n.formatMessage({
                                  id: "required",
                                })}`}
                                className={conditionStyles.inputNumber}
                              />
                            </Form.Item>
                            {condFlag && (
                              <>
                                <Form.Item noStyle>
                                  <span>to</span>
                                </Form.Item>
                                <Form.Item
                                  className={conditionStyles.formItemMargin}
                                  name={[field.name, "val2"]}
                                  rules={[
                                    {
                                      required: true,
                                      message: i18n.formatMessage({
                                        id: "required",
                                      }),
                                    },
                                  ]}
                                >
                                  <InputNumber
                                    placeholder={`${i18n.formatMessage({
                                      id: "required",
                                    })}`}
                                    className={conditionStyles.inputNumber}
                                  />
                                </Form.Item>
                              </>
                            )}
                          </Space>
                        );
                      }}
                    </Form.Item>
                    <Form.Item noStyle>
                      <Space>
                        <a
                          onClick={() =>
                            options.add({ typ: 1, exp: 0, cond: 0 })
                          }
                        >
                          {i18n.formatMessage({ id: "add" })}
                        </a>
                        {!isFistCondition && (
                          <a onClick={() => options.remove(field.name)}>
                            {i18n.formatMessage({ id: "delete" })}
                          </a>
                        )}
                      </Space>
                    </Form.Item>
                  </Space>
                );
              })}
              {fields.length < 1 && (
                <Form.Item noStyle>
                  <Button
                    type="dashed"
                    onClick={() => options.add({ typ: 0, exp: 0, cond: 0 })}
                    block
                    icon={<PlusOutlined />}
                  >
                    {i18n.formatMessage({ id: "add" })}
                  </Button>
                  <Form.ErrorList
                    className={conditionStyles.lineError}
                    errors={errors}
                  />
                </Form.Item>
              )}
            </div>
          );
        }}
      </Form.List>
    </Form.Item>
  );
};
export default TriggerConditionItem;
