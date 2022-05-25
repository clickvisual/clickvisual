import { Button, Form, Input, Modal, Select } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import DetailList from "./detailList";
import { useIntl } from "umi";

const { Option } = Select;

const belongSourceList = [{ value: "instance", name: "实例", key: "instance" }];

const RoleModel = () => {
  const {
    roleModal,
    roleType,
    openModalType,
    isEditor,
    iid,
    selectedRole,
    resetRole,
    doUpdatePmsRole,
    doCreatedPmsRole,
  } = useModel("pms");
  const [roleModalForm] = Form.useForm();
  const i18n = useIntl();

  const handleSubmit = (field: any) => {
    if (isEditor) {
      doUpdatePmsRole(field.id, field);
    } else {
      doCreatedPmsRole(field);
    }
  };
  useEffect(() => {
    if (isEditor) {
      roleModalForm.setFieldsValue({ ...selectedRole });
    } else {
      roleModalForm.setFieldsValue({
        resourceId: iid,
        roleType: roleType,
        belongResource: belongSourceList[0].value,
      });
    }
    return () => {
      roleModalForm.resetFields();
    };
  }, [roleModal, selectedRole]);

  const editorConfirm = () => {
    Modal.confirm({
      title: i18n.formatMessage({
        id: "systemSetting.instancePanel.roleAssign.editModel.title",
      }),
      content: i18n.formatMessage({
        id: "systemSetting.instancePanel.roleAssign.editModel.content",
      }),
      onOk: roleModalForm.submit,
      okText: i18n.formatMessage({
        id: "button.ok",
      }),
      cancelText: i18n.formatMessage({
        id: "button.cancel",
      }),
    });
  };
  const modalFooter = [
    <Button key="back" onClick={resetRole}>
      {i18n.formatMessage({
        id: "button.cancel",
      })}
    </Button>,
    <Button
      key="submit"
      onClick={isEditor ? editorConfirm : roleModalForm.submit}
      type="primary"
    >
      {i18n.formatMessage({
        id: "button.save",
      })}
    </Button>,
  ];
  return (
    <Modal
      title={`${
        isEditor
          ? i18n.formatMessage({
              id: "edit",
            })
          : i18n.formatMessage({
              id: "create",
            })
      }${
        roleType === 2
          ? i18n.formatMessage({
              id: "systemSetting.instancePanel.roleAssign.roleModel.custom",
            })
          : ""
      }${i18n.formatMessage({
        id: "systemSetting.instancePanel.roleAssign.roleModel.role",
      })}`}
      visible={roleModal}
      destroyOnClose={true}
      onCancel={resetRole}
      width={"60vw"}
      footer={modalFooter}
      mask={false}
      centered
    >
      <Form form={roleModalForm} onFinish={handleSubmit}>
        <Form.Item name={"id"} hidden />
        <Form.Item name={"roleType"} hidden />
        <Form.Item name={"resourceId"} hidden />
        <Form.Item
          label={i18n.formatMessage({
            id: "systemSetting.instancePanel.roleAssign.roleModel.resources",
          })}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "systemSetting.instancePanel.roleAssign.roleModel.resources.placeholder",
              }),
            },
          ]}
          name={"belongResource"}
        >
          <Select
            disabled={isEditor || openModalType === "instance"}
            placeholder={i18n.formatMessage({
              id: "systemSetting.instancePanel.roleAssign.roleModel.resources.placeholder",
            })}
          >
            {belongSourceList.map((item) => (
              <Option key={item.value} value={item.value}>
                {i18n.formatMessage({
                  id: `systemSetting.instancePanel.roleAssign.roleModel.${item.key}`,
                })}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          name={"name"}
          label={i18n.formatMessage({
            id: `systemSetting.instancePanel.roleAssign.roleModel.EnglishName`,
          })}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: `systemSetting.instancePanel.roleAssign.roleModel.EnglishName.placeholder`,
              }),
            },
          ]}
        >
          <Input
            placeholder={i18n.formatMessage({
              id: `systemSetting.instancePanel.roleAssign.roleModel.EnglishName.placeholder`,
            })}
          />
        </Form.Item>
        <Form.Item
          name={"desc"}
          label={i18n.formatMessage({
            id: `systemSetting.instancePanel.roleAssign.roleModel.roleDescription`,
          })}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: `systemSetting.instancePanel.roleAssign.roleModel.roleDescription.placeholder`,
              }),
            },
          ]}
        >
          <Input
            placeholder={i18n.formatMessage({
              id: `systemSetting.instancePanel.roleAssign.roleModel.roleDescription.placeholder`,
            })}
          />
        </Form.Item>
        <Form.Item>
          <DetailList />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RoleModel;
