import instanceModalStyles from "@/pages/SystemSetting/InstancePanel/components/CreatedOrUpdatedInstanceModal/index.less";
import { Button, Form, FormInstance, Input, Select } from "antd";
import { useDebounceFn } from "ahooks";
import type { InstanceType } from "@/services/systemSetting";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useRef } from "react";
import CustomModal from "@/components/CustomModal";
import { DEBOUNCE_WAIT } from "@/config/config";
import { useIntl } from "umi";
import { SaveOutlined } from "@ant-design/icons";

type CreatedOrUpdatedInstanceModalProps = {
  isEditor?: boolean;
  current?: InstanceType;
  visible: boolean;
  onCancel: () => void;
};
const { Option } = Select;

const CreatedOrUpdatedInstanceModal = (
  props: CreatedOrUpdatedInstanceModalProps
) => {
  const { visible, isEditor, current, onCancel } = props;
  const { doCreatedInstance, doUpdatedInstance, doGetInstanceList } =
    useModel("instances");
  const instanceFormRef = useRef<FormInstance>(null);
  const i18n = useIntl();

  const onSubmit = (field: InstanceType) => {
    if (isEditor && current?.id) {
      doUpdatedInstance.run(current.id, field).then((res) => {
        if (res?.code === 0) doGetInstanceList();
      });
    } else {
      doCreatedInstance.run(field).then((res) => {
        if (res?.code === 0) doGetInstanceList();
      });
    }
    onCancel();
  };
  const { run } = useDebounceFn(onSubmit, { wait: DEBOUNCE_WAIT });

  useEffect(() => {
    if (visible && isEditor && current) {
      instanceFormRef.current?.setFieldsValue(current);
    } else {
      instanceFormRef.current?.resetFields();
    }
  }, [visible, isEditor, current]);

  return (
    <CustomModal
      title={i18n.formatMessage({
        id: `instance.form.title.${!isEditor ? "created" : "edit"}`,
      })}
      visible={visible}
      onCancel={onCancel}
      width={"45vw"}
    >
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 18 }}
        ref={instanceFormRef}
        onFinish={run}
      >
        <Form.Item
          name={"instanceName"}
          label={i18n.formatMessage({ id: "instance.instanceName" })}
        >
          <Input
            placeholder={i18n.formatMessage({
              id: "instance.form.placeholder.instanceName",
            })}
            allowClear
          />
        </Form.Item>
        <Form.Item
          name={"datasource"}
          label={i18n.formatMessage({ id: "instance.datasource" })}
          initialValue={"ch"}
        >
          <Select
            placeholder={i18n.formatMessage({
              id: "instance.form.placeholder.datasource",
            })}
            disabled
          >
            <Option value={"ch"}>ClickHouse</Option>
          </Select>
        </Form.Item>
        <Form.Item name={"dsn"} label={"DSN"}>
          <Input.TextArea
            placeholder={i18n.formatMessage(
              { id: "instance.form.placeholder.dsn" },
              {
                example:
                  "tcp://127.0.0.1:8080?username=root&password=pass&read_timeout=10&write_timeout=20&debug=true",
              }
            )}
            autoSize={{ minRows: 5, maxRows: 5 }}
            allowClear
          />
        </Form.Item>
        <Form.Item noStyle>
          <div className={instanceModalStyles.submitBtn}>
            <Button
              loading={doCreatedInstance.loading || doUpdatedInstance.loading}
              type={"primary"}
              htmlType={"submit"}
              icon={<SaveOutlined />}
            >
              {i18n.formatMessage({ id: "submit" })}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </CustomModal>
  );
};
export default CreatedOrUpdatedInstanceModal;
