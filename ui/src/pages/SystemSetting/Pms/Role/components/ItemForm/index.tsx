import React, { useEffect, useState } from 'react';
import { Form, Input, Modal, Select } from 'antd';
import { useModel } from '@@/plugin-model/useModel';
import { ItemInfo } from '@/models/pms';

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
  const { commonInfo, fetchPmsCommonInfo } = useModel('pms');
  const [subResource, setSubResource] = useState<ItemInfo[] | undefined>([]);

  useEffect(() => {
    if (form && !modalVisible) {
      form.resetFields();
    }
  }, [modalVisible]);

  useEffect(() => {
    if (initialValues) {
      let state = '0';
      if (initialValues.state === 1) {
        state = '1';
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
    const selectedBelongType = form.getFieldValue('belong_type');
    if (selectedBelongType === 'app') {
      setSubResource(commonInfo?.app_subResources_info);
    } else if (selectedBelongType === 'configResource') {
      setSubResource(commonInfo?.configRsrc_subResources_info);
    }
  };

  const modalFooter = { okText: '保存', onOk: handleSubmit, onCancel };

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
          label="所属资源"
          name="belong_type"
          rules={[
            {
              required: true,
              message: '请选择所属类型',
            },
          ]}
        >
          <Select
            showSearch
            optionFilterProp="children"
            style={{ width: 200 }}
            onChange={handleChangeBelongType}
          >
            <Select.Option value={'app'}>app 应用</Select.Option>
            <Select.Option value={'configResource'}>配置资源</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          name="role_name"
          label="角色英文名"
          rules={[
            {
              required: true,
              message: '请输入角色英文名',
            },
          ]}
        >
          <Input placeholder={'必填'} />
        </Form.Item>
        <Form.Item
          name="description"
          label="角色描述"
          rules={[
            {
              required: true,
              message: '请输入角色描述信息',
            },
          ]}
        >
          <Input placeholder={'必填'} />
        </Form.Item>
        <Form.Item
          label="子资源"
          name="sub_resources"
          rules={[
            {
              required: true,
              message: '请选择子资源',
            },
          ]}
        >
          <Select mode="multiple" showSearch optionFilterProp="children" style={{ width: 200 }}>
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
          label="准许操作"
          name="acts"
          rules={[
            {
              required: true,
              message: '请选择授权操作',
            },
          ]}
        >
          <Select showSearch optionFilterProp="children" style={{ width: 200 }} mode="multiple">
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
