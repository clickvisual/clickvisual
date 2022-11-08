import styles from "./index.less";
import { Form, FormInstance, Input, Modal, Select, Switch } from "antd";
import { useRef } from "react";
import { useModel } from "umi";
import classNames from "classnames";

enum operatorType {
  is = 1,
  isOneOf = 2,
  isBetween = 3,
  exists = 4,
}

const operatorList = [
  { text: "is", type: operatorType.is },
  { text: "is not", type: operatorType.is },
  { text: "is one of", type: operatorType.isOneOf },
  { text: "is not one of", type: operatorType.isOneOf },
  { text: "is between", type: operatorType.isBetween },
  { text: "is not between", type: operatorType.isBetween },
  { text: "exists", type: operatorType.exists },
  { text: "does not exist", type: operatorType.exists },
];

const { Option } = Select;

const CreateLogFilter = ({ tables }: { tables: any[] }) => {
  const { visibleLogFilter, onChangeVisibleLogFilter } = useModel("dataLogs");
  const formFilterRef = useRef<FormInstance>(null);

  const handleFinish = (file: any) => {
    // console.log(file);
  };

  const handleFindType = (
    text: string,
    list: { text: string; type: number }[]
  ) => {
    return list.filter(
      (item: { text: string; type: number }) => item.text == text
    )[0]?.type;
  };

  return (
    <Modal
      title="Add filter"
      visible={visibleLogFilter}
      onOk={() => formFilterRef.current?.submit()}
      onCancel={() => onChangeVisibleLogFilter(false)}
      width={800}
    >
      <Form ref={formFilterRef} layout={"vertical"} onFinish={handleFinish}>
        <div className={classNames([styles.statementBox, styles.title])}>
          <div className={styles.field}>
            <div style={{ width: "100%" }}>Field</div>
            <Form.Item noStyle label="Field" name={"field"}>
              <Select
                style={{ width: "100%" }}
                placeholder={"Select a field first"}
              >
                {tables.map((item: string) => {
                  return (
                    <Option key={item} value={item}>
                      {item}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </div>
          <div className={styles.operator}>
            <div style={{ width: "100%" }}>operator</div>
            <Form.Item noStyle label="Operator" name={"operator"}>
              <Select style={{ width: "200px" }}>
                {operatorList.map(
                  (item: { text: string; type: operatorType }) => {
                    return (
                      <Option value={item.text} key={item.text}>
                        {item.text}
                      </Option>
                    );
                  }
                )}
              </Select>
            </Form.Item>
          </div>
        </div>
        <div className={styles.title}>
          <Form.Item
            noStyle
            shouldUpdate={(pre, next) => pre.operator != next.operator}
          >
            {({ getFieldValue }) => {
              const currentOperatorType = handleFindType(
                getFieldValue("operator"),
                operatorList
              );
              switch (currentOperatorType) {
                case operatorType.is:
                  return (
                    <div>
                      <span>Value</span>
                      <Form.Item name={"value"}>
                        <Input placeholder="Enter a value" />
                      </Form.Item>
                    </div>
                  );
                case operatorType.isOneOf:
                  return (
                    <div>
                      <span>Value</span>
                      <Form.Item name={"value"}>
                        <Select placeholder="Select a value">
                          {[1].map((item: any) => {
                            return <Option key={item}>{item}</Option>;
                          })}
                        </Select>
                      </Form.Item>
                    </div>
                  );
                case operatorType.isBetween:
                  return (
                    <Form.Item style={{ marginTop: "20px" }}>
                      <Form.Item
                        name={"startValue"}
                        style={{ width: "50%", display: "block" }}
                      >
                        <Input placeholder="Start of the range" type="number" />
                      </Form.Item>
                      <Form.Item
                        name={"endValue"}
                        style={{ width: "50%", display: "block" }}
                      >
                        <Input placeholder="End of the range" type="number" />
                      </Form.Item>
                    </Form.Item>
                  );
                case operatorType.exists:
                  return <></>;

                default:
                  return <></>;
              }
            }}
          </Form.Item>
        </div>
        <div className={classNames([styles.customBox])}>
          <Form.Item name={"isCustom"} noStyle valuePropName="checked">
            <Switch />
          </Form.Item>
          <span style={{ paddingLeft: "10px" }}>Create custom label?</span>
        </div>

        <Form.Item shouldUpdate={(pre, next) => pre.isCustom != next.isCustom}>
          {({ getFieldValue }) => {
            const isCustom = getFieldValue("isCustom");
            if (isCustom) {
              return (
                <div className={classNames([styles.alias, styles.title])}>
                  <div style={{ width: "100%" }}>Custom label</div>
                  <Form.Item name={"alias"} noStyle>
                    <Input />
                  </Form.Item>
                </div>
              );
            }
            return <></>;
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreateLogFilter;
