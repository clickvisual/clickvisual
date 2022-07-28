import { Form, InputNumber, Switch } from "antd";
import { useIntl } from "umi";

const TimeProperty = (props: { form: any }) => {
  const i18n = useIntl();
  const { form } = props;
  return (
    <div style={{ padding: "10px 0 0 20px" }}>
      <Form.Item
        name={"isRetry"}
        valuePropName="checked"
        label={i18n.formatMessage({
          id: "bigdata.components.RightMenu.Scheduling.autoRerun",
        })}
      >
        <Switch />
      </Form.Item>
      <Form.Item
        shouldUpdate={(prevValues, nextValues) =>
          prevValues.isRetry !== nextValues.isRetry
        }
        noStyle
      >
        {({ getFieldValue }) => {
          const isRetry = getFieldValue("isRetry");
          if (!isRetry) {
            return <></>;
          }
          return (
            <>
              <Form.Item
                name={"retryInterval"}
                label={i18n.formatMessage({
                  id: "bigdata.components.RightMenu.Scheduling.rerunsNumber",
                })}
              >
                <InputNumber
                  min={1}
                  max={10}
                  addonBefore={
                    <a
                      onClick={() => {
                        const retryInterval =
                          form.current?.getFieldValue("retryInterval");
                        if (retryInterval > 1) {
                          form.current?.setFieldsValue({
                            retryInterval: retryInterval - 1,
                          });
                        }
                      }}
                    >
                      -
                    </a>
                  }
                  addonAfter={
                    <a
                      onClick={() => {
                        const retryInterval =
                          form.current?.getFieldValue("retryInterval");
                        if (retryInterval < 10) {
                          form.current?.setFieldsValue({
                            retryInterval: retryInterval + 1,
                          });
                        }
                      }}
                    >
                      +
                    </a>
                  }
                />
              </Form.Item>
              <Form.Item
                name={"retryTimes"}
                label={i18n.formatMessage({
                  id: "bigdata.components.RightMenu.Scheduling.rerunInterval",
                })}
              >
                <InputNumber
                  min={1}
                  max={30}
                  controls
                  addonBefore={
                    <a
                      onClick={() => {
                        const retryTimes =
                          form.current?.getFieldValue("retryTimes");
                        if (retryTimes > 1) {
                          form.current?.setFieldsValue({
                            retryTimes: retryTimes - 1,
                          });
                        }
                      }}
                    >
                      -
                    </a>
                  }
                  addonAfter={
                    <a
                      onClick={() => {
                        const retryTimes =
                          form.current?.getFieldValue("retryTimes");
                        if (retryTimes < 30) {
                          form.current?.setFieldsValue({
                            retryTimes: retryTimes + 1,
                          });
                        }
                      }}
                    >
                      +
                    </a>
                  }
                />
              </Form.Item>
            </>
          );
        }}
      </Form.Item>
    </div>
  );
};
export default TimeProperty;
