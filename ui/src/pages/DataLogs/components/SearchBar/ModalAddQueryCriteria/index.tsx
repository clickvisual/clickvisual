import CustomModal from "@/components/CustomModal";
import { AutoComplete, Button, Form, FormInstance, Select } from "antd";
import { useEffect, useRef } from "react";
import { useModel } from "@@/plugin-model/useModel";
import lodash from "lodash";

const { Option } = Select;
type ModalAddQueryCriteriaProps = {
  visible: boolean;
  onCancel: () => void;
};
const operatorList = ["=", "!="];
const ModalAddQueryCriteria = (props: ModalAddQueryCriteriaProps) => {
  const formRef = useRef<FormInstance>(null);
  const { visible, onCancel } = props;
  const {
    logs,
    doParseQuery,
    doGetLogs,
    doGetHighCharts,
    keywordInput,
    onChangeKeywordInput,
  } = useModel("dataLogs");
  const columns: string[] = (logs?.logs[0] && Object.keys(logs?.logs[0])) || [];
  useEffect(() => {
    if (!visible) {
      formRef.current?.resetFields();
    }
  }, [visible]);
  return (
    <CustomModal
      title={"增加查询条件"}
      visible={visible}
      onCancel={onCancel}
      footer={
        <Button type={"primary"} onClick={() => formRef.current?.submit()}>
          保存
        </Button>
      }
    >
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
        ref={formRef}
        onFinish={(field) => {
          const addValue = `${field.column}${field.operator}'${field.value}'`;
          const defaultValueArr =
            lodash.cloneDeep(keywordInput)?.split(" and ") || [];
          if (defaultValueArr.length === 1 && defaultValueArr[0] === "")
            defaultValueArr.pop();
          defaultValueArr.push(addValue);
          const kw = defaultValueArr.join(" and ");
          onChangeKeywordInput(kw);
          doGetLogs({ kw });
          doGetHighCharts({ kw });
          doParseQuery(kw);
        }}
      >
        <Form.Item
          name={"column"}
          label={"column"}
          rules={[{ required: true }]}
        >
          <Select placeholder={"请选择 columns"}>
            {columns.map((item) => (
              <Option key={item} value={item}>
                {item}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          name={"operator"}
          label={"operator"}
          rules={[{ required: true }]}
        >
          <Select placeholder={"请选择 operator"}>
            {operatorList.map((item) => (
              <Option key={item} value={item}>
                {item}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, next) => prev.column !== next.column}
        >
          {({ getFieldValue }) => {
            const flag = !getFieldValue("column");
            return (
              <Form.Item
                name={"value"}
                label={"value"}
                rules={[{ required: true }]}
              >
                <AutoComplete
                  disabled={flag}
                  style={{ width: "100%" }}
                  allowClear
                  options={[]}
                  placeholder="请输入 value"
                  filterOption={(inputValue, option) =>
                    option!.value
                      .toUpperCase()
                      .indexOf(inputValue.toUpperCase()) !== -1
                  }
                />
              </Form.Item>
            );
          }}
        </Form.Item>
      </Form>
    </CustomModal>
  );
};

export default ModalAddQueryCriteria;
