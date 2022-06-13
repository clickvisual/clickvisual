import { Form, FormInstance, Input, Modal } from "antd";
import { useRef, useState } from "react";
import { useModel } from "umi";

const CreactAndUpdateFolder = () => {
  const folderForm = useRef<FormInstance>(null);
  const { currentInstances, temporaryQuery } = useModel("dataAnalysis");

  const {
    doCreatedFolder,
    doUpdateFolder,
    visibleFolder,
    changeVisibleFolder,
  } = temporaryQuery;

  const handleSubmit = (file: any) => {
    console.log(file, "提交了");
  };
  return (
    <Modal
      //   width={700}
      confirmLoading={doCreatedFolder.loading || doUpdateFolder.loading}
      title={"新建文件夹"}
      visible={visibleFolder}
      bodyStyle={{ paddingBottom: 0 }}
      onCancel={() => changeVisibleFolder(false)}
      onOk={() => folderForm.current?.submit()}
    >
      <Form
        ref={folderForm}
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 14 }}
        onFinish={handleSubmit}
      >
        <Form.Item name={"id"} hidden>
          <Input />
        </Form.Item>
        <Form.Item name={"iid"} hidden>
          <Input />
        </Form.Item>
        <Form.Item name={"parentId"} hidden>
          <Input />
        </Form.Item>

        <Form.Item name={"name"} label="name">
          <Input />
        </Form.Item>

        <Form.Item name={"desc"} label="desc">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreactAndUpdateFolder;
