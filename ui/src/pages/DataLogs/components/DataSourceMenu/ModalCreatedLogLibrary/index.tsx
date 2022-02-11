import CustomModal from "@/components/CustomModal";
import {
  Button,
  Form,
  FormInstance,
  Input,
  InputNumber,
  message,
  Select,
} from "antd";
import { useEffect, useRef } from "react";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { SaveOutlined } from "@ant-design/icons";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
const { Option } = Select;

export const logLibraryTypes = [
  { value: 1, type: "string" },
  { value: 2, type: "float" },
];

const ModalCreatedLogLibrary = () => {
  const logFormRef = useRef<FormInstance>(null);
  const i18n = useIntl();
  const {
    currentDatabase,
    logLibraryCreatedModalVisible,
    onChangeLogLibraryCreatedModalVisible,
    doCreatedLogLibrary,
    doGetLogLibraryList,
  } = useModel("dataLogs");

  const onSubmitHandle = useDebounceFn(
    (field: any) => {
      if (!currentDatabase) return;
      doCreatedLogLibrary
        .run(currentDatabase.id, field)
        .then((res) => {
          if (res?.code === 0) {
            message.success(
              i18n.formatMessage({
                id: "datasource.logLibrary.created.success",
              })
            );
            doGetLogLibraryList();
          }
          onChangeLogLibraryCreatedModalVisible(false);
        })
        .catch(() => onChangeLogLibraryCreatedModalVisible(false));
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  useEffect(() => {
    if (!logLibraryCreatedModalVisible && logFormRef.current)
      logFormRef.current.resetFields();
  }, [logLibraryCreatedModalVisible]);

  return (
    <CustomModal
      title={i18n.formatMessage({ id: "datasource.logLibrary.search.created" })}
      width={700}
      visible={logLibraryCreatedModalVisible}
      onCancel={() => onChangeLogLibraryCreatedModalVisible(false)}
      footer={
        <Button
          loading={doCreatedLogLibrary.loading}
          type="primary"
          onClick={() => logFormRef.current?.submit()}
          icon={<SaveOutlined />}
        >
          {i18n.formatMessage({ id: "submit" })}
        </Button>
      }
    >
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
        ref={logFormRef}
        onFinish={onSubmitHandle}
      >
        <Form.Item
          label={i18n.formatMessage({
            id: "datasource.logLibrary.from.tableName",
          })}
          name={"tableName"}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "datasource.logLibrary.placeholder.tableName",
              }),
            },
            {
              pattern: new RegExp(/^[a-zA-Z_]+$/),
              message: i18n.formatMessage({
                id: "datasource.logLibrary.from.rule.tableName",
              }),
            },
          ]}
        >
          <Input
            placeholder={`${i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.tableName",
            })}`}
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "datasource.logLibrary.from.type" })}
          name={"typ"}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "datasource.logLibrary.placeholder.type",
              }),
            },
          ]}
        >
          <Select
            placeholder={`${i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.type",
            })}`}
          >
            {logLibraryTypes.map((item) => (
              <Option key={item.value} value={item.value}>
                {item.type}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "datasource.logLibrary.from.days" })}
          name={"days"}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "datasource.logLibrary.placeholder.days",
              }),
            },
          ]}
        >
          <InputNumber
            placeholder={`${i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.days",
            })}`}
            min={0}
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "datasource.logLibrary.from.brokers",
          })}
          name={"brokers"}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "datasource.logLibrary.placeholder.brokers",
              }),
            },
          ]}
        >
          <Input
            placeholder={`${i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.brokers",
            })}`}
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "datasource.logLibrary.from.topics",
          })}
          name={"topics"}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "datasource.logLibrary.placeholder.topics",
              }),
            },
            {
              pattern: new RegExp(/^[a-zA-Z\-]+$/),
              message: i18n.formatMessage({
                id: "datasource.logLibrary.from.rule.topics",
              }),
            },
          ]}
        >
          <Input
            placeholder={`${i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.topics",
            })}`}
          />
        </Form.Item>
      </Form>
    </CustomModal>
  );
};
export default ModalCreatedLogLibrary;
