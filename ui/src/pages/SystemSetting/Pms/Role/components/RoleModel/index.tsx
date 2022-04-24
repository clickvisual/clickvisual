import { Button, Form, Input, Modal, Select } from 'antd';
import { useModel } from '@@/plugin-model/useModel';
import { useEffect } from 'react';
import DetailList from './detailList';

const { Option } = Select;

const belongSourceList = [
  { value: 'app', name: 'app 应用' },
  { value: 'configResource', name: '配置资源' },
];

const RoleModel = () => {
  const {
    roleModal,
    roleType,
    openModalType,
    isEditor,
    aid,
    selectedRole,
    resetRole,
    doUpdatePmsRole,
    doCreatedPmsRole,
  } = useModel('pms');
  const [roleModalForm] = Form.useForm();

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
        resourceId: aid,
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
      title: '更新操作',
      content: '您确定要更新角色内容吗？',
      onOk: roleModalForm.submit,
      okText: '确认',
      cancelText: '取消',
    });
  };
  const modalFooter = [
    <Button key="back" onClick={resetRole}>
      取消
    </Button>,
    <Button key="submit" onClick={isEditor ? editorConfirm : roleModalForm.submit} type="primary">
      保存
    </Button>,
  ];
  return (
    <Modal
      title={`${isEditor ? '编辑' : '新建'}${roleType === 2 ? '自定义' : ''}角色`}
      visible={roleModal}
      destroyOnClose={true}
      onCancel={resetRole}
      width={'60vw'}
      footer={modalFooter}
      mask={false}
      centered
    >
      <Form form={roleModalForm} onFinish={handleSubmit}>
        <Form.Item name={'id'} hidden />
        <Form.Item name={'roleType'} hidden />
        <Form.Item name={'resourceId'} hidden />
        <Form.Item
          label={'所属资源'}
          rules={[{ required: true, message: '请选择所属资源' }]}
          name={'belongResource'}
        >
          <Select disabled={isEditor || openModalType === 'app'} placeholder={'请选择所属资源'}>
            {belongSourceList.map((item) => (
              <Option key={item.value} value={item.value}>
                {item.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          name={'name'}
          label={'角色英文名'}
          rules={[{ required: true, message: '请输入角色英文名' }]}
        >
          <Input placeholder={'请输入角色英文名'} />
        </Form.Item>
        <Form.Item
          name={'desc'}
          label={'角色描述'}
          rules={[{ required: true, message: '请输入角色描述' }]}
        >
          <Input placeholder={'请输入角色描述'} />
        </Form.Item>
        <Form.Item>
          <DetailList />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RoleModel;
