import { folderType } from "@/models/dataanalysis/useTemporaryQuery";
import { bigDataNavEnum } from "@/pages/DataAnalysis/Nav";
import { Form, FormInstance, Input, message, Modal } from "antd";
import { useEffect, useRef } from "react";
import { useModel } from "umi";

const CreateAndUpdateFolder = () => {
  const folderForm = useRef<FormInstance>(null);
  const { currentInstances, temporaryQuery, navKey } = useModel("dataAnalysis");
  const primary = navKey == bigDataNavEnum.TemporaryQuery ? 3 : 0;

  const {
    getDataList,
    doCreatedFolder,
    doUpdateFolder,
    currentFolder,
    isUpdateFolder,
    visibleFolder,
    changeVisibleFolder,
  } = temporaryQuery;

  useEffect(() => {
    if (visibleFolder && currentFolder) {
      if (!isUpdateFolder) {
        if (currentFolder.nodeType == folderType.node) {
          // 节点上创建是指在节点父级文件夹上创建
          folderForm.current?.setFieldsValue({
            iid: currentInstances,
            parentId: currentFolder.parentId,
            primary: primary,
          });
          return;
        }
        folderForm.current?.setFieldsValue({
          iid: currentInstances,
          parentId: currentFolder.id,
          primary: primary,
        });
        return;
      }
      folderForm.current?.setFieldsValue({
        iid: currentInstances,
        id: currentFolder.id,
        parentId: currentFolder.parentId,
        primary: primary,
        name: currentFolder.name,
        desc: currentFolder.desc,
      });
      return;
    }
    folderForm.current?.resetFields();
  }, [currentFolder, visibleFolder]);

  const handleSubmit = (file: {
    iid: number;
    id: number;
    name: string;
    primary: number;
    parentId?: number;
    desc?: string;
  }) => {
    const data = {
      iid: file.iid as number,
      id: file.id as number,
      name: file.name as string,
      primary: file.primary as number,
      parentId: file.parentId as number,
      desc: file.desc as string,
    };
    if (!isUpdateFolder) {
      doCreatedFolder.run(data).then((res: any) => {
        if (res.code == 0) {
          message.success("新建成功");
          changeVisibleFolder(false);
          getDataList(currentInstances as number);
        }
      });
      return;
    }
    doUpdateFolder.run(data.id, data).then((res: any) => {
      if (res.code == 0) {
        message.success("更新成功");
        changeVisibleFolder(false);
        getDataList(currentInstances as number);
      }
    });
  };
  return (
    <Modal
      confirmLoading={doCreatedFolder.loading || doUpdateFolder.loading}
      title={!isUpdateFolder ? "新建文件夹" : "修改文件夹"}
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
        <Form.Item name={"primary"} hidden>
          <Input />
        </Form.Item>
        <Form.Item name={"name"} label="name" required>
          <Input />
        </Form.Item>
        <Form.Item name={"desc"} label="desc">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreateAndUpdateFolder;
