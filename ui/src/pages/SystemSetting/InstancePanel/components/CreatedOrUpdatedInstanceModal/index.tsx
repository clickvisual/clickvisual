import instanceModalStyles from "@/pages/SystemSetting/InstancePanel/components/CreatedOrUpdatedInstanceModal/index.less";
import { Button, Form, FormInstance, Input, Select } from "antd";
import { useDebounceFn } from "ahooks";
import type { InstanceType } from "@/services/systemSetting";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useRef } from "react";
import CustomModal from "@/components/CustomModal";
import { DEBOUNCE_WAIT } from "@/config/config";

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
      title={!isEditor ? "新增实例" : `编辑实例`}
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
        <Form.Item name={"instanceName"} label={"实例名称"}>
          <Input placeholder={"请输入实例名称"} allowClear />
        </Form.Item>
        <Form.Item name={"datasource"} label={"数据库类型"} initialValue={"ch"}>
          <Select placeholder={"请选择数据库类型"} disabled>
            <Option value={"ch"}>ClickHouse</Option>
          </Select>
        </Form.Item>
        <Form.Item name={"dsn"} label={"数据源连接串"}>
          <Input.TextArea
            placeholder={
              "请输入数据源连接串，例如：tcp://127.0.0.1:8080?username=root&password=pass&read_timeout=10&write_timeout=20&debug=true"
            }
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
            >
              提交
            </Button>
          </div>
        </Form.Item>
      </Form>
    </CustomModal>
  );
};
export default CreatedOrUpdatedInstanceModal;
