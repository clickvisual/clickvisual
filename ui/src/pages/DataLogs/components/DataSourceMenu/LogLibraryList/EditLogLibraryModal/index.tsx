import { Form, FormInstance, Input, message, Modal, Select } from "antd";
import { useEffect, useRef } from "react";
import { useModel, useIntl } from "umi";

const EditLogLibraryModal = () => {
  const { Option } = Select;
  const { TextArea } = Input;
  const i18n = useIntl();
  const {
    isModifyLog,
    onChangeIsModifyLog,
    currentEditLogLibrary,
    doGetLogLibraryList,
    doUpdataLogLibrary,
  } = useModel("dataLogs");
  const editDatabaseFormRef = useRef<FormInstance>(null);

  useEffect(() => {
    if (isModifyLog) {
      editDatabaseFormRef.current?.setFieldsValue(currentEditLogLibrary);
    } else {
      editDatabaseFormRef.current?.resetFields();
    }
  }, [isModifyLog]);
  const handleSubmit = (val: any) => {
    if (!val.id) return;
    doUpdataLogLibrary
      .run(val.id, val)
      .then((res: any) => {
        if (res.code != 0) {
          message.error(res.msg);
          return;
        }
        message.success(
          i18n.formatMessage({ id: "log.editLogLibraryModal.modifySuc" })
        );
        onChangeIsModifyLog(false);
        doGetLogLibraryList();
      })
      .catch((res) => {
        res?.msg && message.error(res.msg);
      });
  };
  return (
    <Modal
      title={i18n.formatMessage({ id: "log.editLogLibraryModal.title" })}
      visible={isModifyLog}
      onCancel={() => onChangeIsModifyLog(false)}
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
        <Form.Item
          label={i18n.formatMessage({
            id: "log.editLogLibraryModal.label.tabName",
          })}
          name={"tableName"}
        >
          <Input disabled />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "log.editLogLibraryModal.label.createType",
          })}
          name={"createType"}
        >
          <Select disabled>
            <Option value={0}>
              {i18n.formatMessage({
                id: "datasource.logLibrary.from.creationMode.option.newLogLibrary",
              })}
            </Option>
            <Option value={1}>
              {i18n.formatMessage({
                id: "datasource.logLibrary.from.creationMode.option.logLibrary",
              })}
            </Option>
          </Select>
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "log.editLogLibraryModal.label.desc",
          })}
          name={"desc"}
        >
          <TextArea
            placeholder={i18n.formatMessage({
              id: "log.editLogLibraryModal.desc.placeholder",
            })}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default EditLogLibraryModal;
