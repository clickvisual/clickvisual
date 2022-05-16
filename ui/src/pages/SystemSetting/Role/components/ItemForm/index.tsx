import React, { useEffect, useState } from "react";
import { Form, Input, Modal, Select } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { ItemInfo } from "@/models/pms";
import { useIntl } from "umi";

interface ListFormProps {
  modalVisible: boolean;
  formTitle: string;
  initialValues: { state: number };
  onSubmit: () => void;
  onCancel: () => void;
}

const formLayout = {
  labelCol: { span: 7 },
  wrapperCol: { span: 13 },
};

const Index: React.FC<ListFormProps> = (props) => {
  const { modalVisible, onCancel, onSubmit, initialValues, formTitle } = props;
  const [form] = Form.useForm();
  const { commonInfo, fetchPmsCommonInfo } = useModel("pms");
  const [subResource, setSubResource] = useState<ItemInfo[] | undefined>([]);
  const i18n = useIntl();
  useEffect(() => {
    if (form && !modalVisible) {
      form.resetFields();
    }
  }, [modalVisible]);

  useEffect(() => {
    if (initialValues) {
      let state = "0";
      if (initialValues.state === 1) {
        state = "1";
      }
      form.setFieldsValue({
        ...initialValues,
        state: state,
      });
    }
  }, [initialValues]);

  const handleSubmit = () => {
    if (!form) return;
    form.submit();
  };

  const handleChangeBelongType = () => {
    if (!commonInfo) {
      fetchPmsCommonInfo();
    }
    const selectedBelongType = form.getFieldValue("belong_type");
    if (selectedBelongType === "table") {
      setSubResource(commonInfo?.app_subResources_info);
    } else if (selectedBelongType === "configResource") {
      setSubResource(commonInfo?.configRsrc_subResources_info);
    }
  };

  const modalFooter = {
    okText: i18n.formatMessage({ id: "systemSetting.role.itemForm.save" }),
    onOk: handleSubmit,
    onCancel,
  };

  return (
    <Modal
      destroyOnClose
      title={formTitle}
      visible={modalVisible}
      onCancel={() => onCancel()}
      {...modalFooter}
    >
      <Form {...formLayout} form={form} onFinish={onSubmit} scrollToFirstError>
        <Form.Item name="id" label="id" hidden />
        <Form.Item
          label={i18n.formatMessage({
            id: "systemSetting.role.itemForm.form.label.belongResource",
          })}
          name="belong_type"
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "systemSetting.role.itemForm.form.belongResource.placeholder",
              }),
            },
          ]}
        >
          <Select
            showSearch
            optionFilterProp="children"
            style={{ width: 200 }}
            onChange={handleChangeBelongType}
          >
            <Select.Option value={"instance"}>
              {i18n.formatMessage({
                id: "systemSetting.role.itemForm.form.belongResource.instance",
              })}
            </Select.Option>
            {/*<Select.Option value={'configResource'}>配置资源</Select.Option>*/}
          </Select>
        </Form.Item>
        <Form.Item
          name="role_name"
          label={i18n.formatMessage({
            id: "systemSetting.role.itemForm.form.label.roleName",
          })}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "systemSetting.role.itemForm.form.roleName.rules",
              }),
            },
          ]}
        >
          <Input
            placeholder={i18n.formatMessage({
              id: "systemSetting.role.itemForm.form.mandatory",
            })}
          />
        </Form.Item>
        <Form.Item
          name="description"
          label={i18n.formatMessage({
            id: "systemSetting.role.itemForm.form.label.description",
          })}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "systemSetting.role.itemForm.form.description.rules",
              }),
            },
          ]}
        >
          <Input
            placeholder={i18n.formatMessage({
              id: "systemSetting.role.itemForm.form.mandatory",
            })}
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "systemSetting.role.itemForm.form.label.sub_resources",
          })}
          name="sub_resources"
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "systemSetting.role.itemForm.form.sub_resources.rules",
              }),
            },
          ]}
        >
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="children"
            style={{ width: 200 }}
          >
            {(subResource || []).map((item, index) => {
              return (
                <Select.Option key={index} value={item.name}>
                  {item.name} | {item.desc}
                </Select.Option>
              );
            })}
          </Select>
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "systemSetting.role.itemForm.form.label.acts",
          })}
          name="acts"
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "systemSetting.role.itemForm.form.acts.rules",
              }),
            },
          ]}
        >
          <Select
            showSearch
            optionFilterProp="children"
            style={{ width: 200 }}
            mode="multiple"
          >
            {(commonInfo?.all_acts_info || []).map((item, index) => {
              return (
                <Select.Option key={index} value={item.name}>
                  {item.name} | {item.desc}
                </Select.Option>
              );
            })}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default Index;
