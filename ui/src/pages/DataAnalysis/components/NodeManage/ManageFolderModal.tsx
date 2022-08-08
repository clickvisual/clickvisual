import { Form, FormInstance, Input, Modal } from "antd";
import { useEffect, useRef } from "react";
import { useModel } from "@@/plugin-model/useModel";
export interface ManageFolderModalType {
  // // visibleFolder: any;
  // isEditNode: any;
  // // extra: any;
  // callbackRef: any;
  // hideFolderModal: any;
  // setCurrentNode: any;
  // currentNode: any;
}

const ManageFolderModal = (props: ManageFolderModalType) => {
  const {
    // visibleFolder,
    // isEditNode,
    // extra,
    // callbackRef,
    // hideFolderModal,
    // setCurrentNode,
    // currentNode,
  } = props;
  const formRef = useRef<FormInstance>(null);
  const { manageNode } = useModel("dataAnalysis");
  const {
    visibleFolder,
    isEditNode,
    extra,
    doCreatedFolder,
    doUpdateFolder,
    callbackRef,
    hideFolderModal,
    setCurrentNode,
    currentNode,
  } = manageNode;

  const onCancel = () => hideFolderModal();

  const handleSubmit = (fields: any) => {
    isEditNode ? updateFolder(fields) : addFolder(fields);
  };

  const addFolder = (fields: any) => {
    doCreatedFolder.run({ ...fields, ...extra }).then(() => {
      callbackRef.current?.();
      onCancel();
    });
  };

  const updateFolder = (fields: any) => {
    doUpdateFolder.run(extra.id, { ...fields, ...extra }).then(() => {
      callbackRef.current?.();
      onCancel();
    });
  };

  useEffect(() => {
    if (!visibleFolder || !formRef.current) return;
    formRef.current.setFieldsValue(extra);
  }, [visibleFolder]);

  useEffect(() => {
    if (!visibleFolder || !formRef.current || !isEditNode) return;
    formRef.current.setFieldsValue({
      name: currentNode.name,
      desc: currentNode.desc,
    });
  }, [visibleFolder]);

  useEffect(() => {
    if (visibleFolder || !formRef.current) return;
    formRef.current.resetFields();
    setCurrentNode(undefined);
  }, [visibleFolder]);

  return (
    <Modal
      title={`${isEditNode ? "编辑" : "新增"}文件夹`}
      visible={visibleFolder}
      onCancel={onCancel}
      onOk={() => formRef.current?.submit()}
      confirmLoading={doCreatedFolder.loading || doUpdateFolder.loading}
    >
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 19 }}
        ref={formRef}
        onFinish={handleSubmit}
      >
        <Form.Item name={"name"} label="name" required>
          <Input placeholder="请输入文件夹名称" />
        </Form.Item>
        <Form.Item name={"desc"} label="desc">
          <Input placeholder="请输入文件夹名称" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default ManageFolderModal;
