import { Form, FormInstance, Input, message, Modal, Select, Spin } from "antd";
import { useEffect, useRef } from "react";
import { useModel, useIntl } from "umi";
import { logLibraryTypes } from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary";
import style from "./index.less";

const EditLogLibraryModal = () => {
  const { Option } = Select;
  const i18n = useIntl();
  const {
    isModifyLog,
    onChangeIsModifyLog,
    currentEditLogLibrary,
    doGetLogLibraryList,
    doGetLogLibrary,
    doUpdataLogLibrary,
    updataLogLibraryLoading,
    getLogLibraryLoading,
  } = useModel("dataLogs");
  const editDatabaseFormRef = useRef<FormInstance>(null);

  useEffect(() => {
    if (isModifyLog && currentEditLogLibrary?.id) {
      doGetLogLibrary
        .run(currentEditLogLibrary.id)
        .then((res: any) => {
          if (res.code != 0) {
            message.error(res.msg);
            return;
          }
          editDatabaseFormRef.current?.setFieldsValue(res.data);
        })
        .catch((res) => {
          res?.msg && message.error(res.msg);
        });
    } else {
      editDatabaseFormRef.current?.resetFields();
    }
  }, [isModifyLog]);

  const handleSubmit = (val: any) => {
    if (!currentEditLogLibrary?.id) return;
    doUpdataLogLibrary
      .run(currentEditLogLibrary?.id, val)
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
      title={i18n.formatMessage({ id: "datasource.tooltip.icon.edit" })}
      visible={isModifyLog}
      onCancel={() => onChangeIsModifyLog(false)}
      onOk={() => editDatabaseFormRef.current?.submit()}
      width={"60%"}
      confirmLoading={updataLogLibraryLoading || getLogLibraryLoading}
    >
      <Form
        ref={editDatabaseFormRef}
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 14 }}
        onFinish={handleSubmit}
        className={style.form}
      >
        <Form.Item name={"id"} hidden>
          <Input />
        </Form.Item>

        {getLogLibraryLoading && (
          <div className={style.spin}>
            <Spin />
          </div>
        )}
        <Form.Item
          label={i18n.formatMessage({
            id: "log.editLogLibraryModal.label.tabName",
          })}
          name={"name"}
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
            id: "datasource.logLibrary.from.type",
          })}
          name={"typ"}
        >
          <Select
            placeholder={`${i18n.formatMessage({
              id: "datasource.logLibrary.placeholder.type",
            })}`}
            disabled
          >
            {logLibraryTypes.map((item) => (
              <Option key={item.value} value={item.value}>
                {item.type}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "datasource.logLibrary.from.newLogLibrary.timeResolutionField",
          })}
          name={"timeField"}
        >
          <Input disabled />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "datasource.logLibrary.from.days",
          })}
          name={"tpy"}
        >
          <Input disabled />
        </Form.Item>
        <Form.Item label="Topics" name={"topic"}>
          <Input disabled />
        </Form.Item>
        <Form.Item label="Brokers" name={"brokers"}>
          <Input disabled />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "DescAsAlias",
          })}
          name={"desc"}
        >
          <Input
            placeholder={i18n.formatMessage({
              id: "log.editLogLibraryModal.label.desc.placeholder",
            })}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default EditLogLibraryModal;
