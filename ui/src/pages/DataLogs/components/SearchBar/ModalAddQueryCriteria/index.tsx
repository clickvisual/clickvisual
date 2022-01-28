import CustomModal from "@/components/CustomModal";
import { AutoComplete, Button, Form, FormInstance, Select } from "antd";
import { useEffect, useRef } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";

const { Option } = Select;
type ModalAddQueryCriteriaProps = {
  visible: boolean;
  onCancel: () => void;
};
const operatorList = ["=", "!=", "<", "<=", ">", ">="];
const ModalAddQueryCriteria = (props: ModalAddQueryCriteriaProps) => {
  const formRef = useRef<FormInstance>(null);
  const i18n = useIntl();
  const { visible, onCancel } = props;
  const { logs, doUpdatedQuery } = useModel("dataLogs");
  const columns: string[] =
    (logs?.logs[0] &&
      Object.keys(logs?.logs[0]).filter(
        (item: string) => item !== "_trace_time_"
      )) ||
    [];
  useEffect(() => {
    if (!visible) {
      formRef.current?.resetFields();
    }
  }, [visible]);
  return (
    <CustomModal
      title={i18n.formatMessage({ id: "log.search.icon.quickSearch" })}
      visible={visible}
      onCancel={onCancel}
      footer={
        <Button
          type={"primary"}
          onClick={() => {
            formRef.current?.submit();
          }}
        >
          {i18n.formatMessage({ id: "button.save" })}
        </Button>
      }
    >
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
        ref={formRef}
        onFinish={(field) => {
          const addValue = `${field.column}${field.operator}'${field.value}'`;
          doUpdatedQuery(addValue);
          onCancel();
        }}
      >
        <Form.Item
          name={"column"}
          label={"column"}
          rules={[{ required: true }]}
        >
          <Select
            placeholder={`${i18n.formatMessage({
              id: "log.search.quickSearch.column.placeholder",
            })}`}
          >
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
          <Select
            placeholder={`${i18n.formatMessage({
              id: "log.search.quickSearch.operator.placeholder",
            })}`}
          >
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
                  placeholder={`${i18n.formatMessage({
                    id: "log.search.quickSearch.value.placeholder",
                  })}`}
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
