import { Form, FormInstance, Input, message, Modal, Select } from "antd";
import { useEffect, useRef } from "react";
import { useModel, useIntl } from "umi";

const EditDatabaseModel = () => {
  const { Option } = Select;
  const { TextArea } = Input;
  const i18n = useIntl();
  const {
    isEditDatabase,
    onChangeIsEditDatavase,
    currentEditDatabase,
    doGetDatabaseList,
  } = useModel("dataLogs");
  const { doUpdatedDatabase } = useModel("database");
  const editDatabaseFormRef = useRef<FormInstance>(null);

  useEffect(() => {
    if (isEditDatabase) {
      editDatabaseFormRef.current?.setFieldsValue(currentEditDatabase);
    } else {
      editDatabaseFormRef.current?.resetFields();
    }
  }, [isEditDatabase]);
  const handleSubmit = (val: any) => {
    if (!val.id) return;
    doUpdatedDatabase.run(val.id, val).then((res: any) => {
      if (res.code != 0) {
        message.error(res.msg);
        return;
      }
      message.success(
        i18n.formatMessage({ id: "log.editLogLibraryModal.modifySuc" })
      );
      onChangeIsEditDatavase(false);
      doGetDatabaseList();
    });
  };
  return (
    <Modal
      title={i18n.formatMessage({ id: "log.editDatabaseModel.title" })}
      visible={isEditDatabase}
      onCancel={() => onChangeIsEditDatavase(false)}
      onOk={() => editDatabaseFormRef.current?.submit()}
      width={"60%"}
    >
      <Form
        ref={editDatabaseFormRef}
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 14 }}
        onFinish={handleSubmit}
      >
        <Form.Item name={"id"} hidden>
          <Input />
        </Form.Item>
        <Form.Item name={"uid"} hidden>
          <Input />
        </Form.Item>
        <Form.Item name={"iid"} hidden>
          <Input />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "database.form.label.name" })}
          name={"name"}
        >
          <Input disabled />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "instance.instanceName",
          })}
          name={"instanceName"}
        >
          <Input disabled />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "log.editDatabaseModel.label.datasourceType",
          })}
          name={"datasourceType"}
        >
          <Input disabled />
        </Form.Item>
        <Form.Item label={i18n.formatMessage({ id: "type" })} name={"mode"}>
          <Select disabled>
            <Option value={1}>
              {i18n.formatMessage({
                id: "instance.form.title.cluster",
              })}
            </Option>
            <Option value={0}>
              {i18n.formatMessage({
                id: "instance.form.title.modeType.single",
              })}
            </Option>
          </Select>
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "instance.form.title.cluster",
          })}
          hidden={editDatabaseFormRef.current?.getFieldValue("mode") == 0}
          name={"clusters"}
        >
          <Input disabled />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "description",
          })}
          name={"desc"}
        >
          <TextArea
            placeholder={i18n.formatMessage({
              id: "datasource.logLibrary.from.newLogLibrary.desc.placeholder",
            })}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default EditDatabaseModel;
