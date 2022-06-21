import { Form, FormInstance, Input, Modal, Select } from "antd";
import { useEffect, useRef } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { TertiaryList } from "@/models/dataanalysis/useManageNodeAndFolder";

const { Option } = Select;

const ManageNodeModal = () => {
  const formRef = useRef<FormInstance>(null);
  const { manageNode } = useModel("dataAnalysis");
  const {
    visibleNode,
    isEditNode,
    extra,
    doCreatedNode,
    doUpdatedNode,
    callbackRef,
    hideNodeModal,
    setCurrentNode,
    currentNode,
  } = manageNode;

  const onCancel = () => hideNodeModal();

  const handleSubmit = (fields: any) => {
    isEditNode ? updateNode(fields) : addNode(fields);
  };

  const addNode = (fields: any) => {
    doCreatedNode.run({ ...fields, ...extra }).then(() => {
      callbackRef.current?.();
      onCancel();
    });
  };

  const updateNode = (fields: any) => {
    doUpdatedNode.run(extra.id, { ...fields, ...extra }).then(() => {
      callbackRef.current?.();
      onCancel();
    });
  };

  useEffect(() => {
    if (!visibleNode || !formRef.current) return;
    formRef.current.setFieldsValue(extra);
  }, [visibleNode]);

  useEffect(() => {
    if (!visibleNode || !formRef.current || !isEditNode) return;
    formRef.current.setFieldsValue({
      name: currentNode.name,
      desc: currentNode.desc,
    });
  }, [visibleNode]);

  useEffect(() => {
    if (visibleNode || !formRef.current) return;
    formRef.current.resetFields();
    setCurrentNode(undefined);
  }, [visibleNode]);

  return (
    <Modal
      title={`${isEditNode ? "编辑" : "新增"}节点`}
      visible={visibleNode}
      onCancel={onCancel}
      onOk={() => formRef.current?.submit()}
      confirmLoading={doCreatedNode.loading || doUpdatedNode.loading}
    >
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 19 }}
        ref={formRef}
        onFinish={handleSubmit}
      >
        <Form.Item name={"tertiary"} label="tertiary">
          <Select placeholder="请选择tertiary">
            {TertiaryList.filter((item) =>
              item.types.includes(extra?.secondary)
            ).map((item: { id: number; title: string; enum: number }) => (
              <Option value={item.enum} key={item.id}>
                {item.title}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name={"name"} label="name" required>
          <Input placeholder="请输入节点名称" />
        </Form.Item>
        <Form.Item name={"desc"} label="desc">
          <Input placeholder="请输入节点名称" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default ManageNodeModal;
