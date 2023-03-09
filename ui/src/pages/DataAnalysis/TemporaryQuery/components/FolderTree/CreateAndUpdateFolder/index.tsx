import { BigDataNavEnum } from "@/pages/DataAnalysis";
import {
  FolderEnums,
  SecondaryEnums,
} from "@/pages/DataAnalysis/service/enums";
import { Form, FormInstance, Input, message, Modal, Select } from "antd";
import { useEffect, useRef } from "react";
import { useIntl, useModel } from "umi";

const { Option } = Select;

const CreateAndUpdateFolder = () => {
  const i18n = useIntl();
  const folderForm = useRef<FormInstance>(null);
  const { currentInstances, temporaryQuery, navKey } = useModel("dataAnalysis");
  const primary = navKey == BigDataNavEnum.TemporaryQuery ? 3 : 0;

  const {
    secondaryList,
    getDataList,
    doCreatedFolder,
    doUpdateFolder,
    currentFolder,
    isUpdateFolder,
    visibleFolder,
    changeVisibleFolder,
    changeIsUpdateFolder,
  } = temporaryQuery;

  useEffect(() => {
    if (visibleFolder && currentFolder) {
      if (!isUpdateFolder) {
        if (currentFolder.nodeType == FolderEnums.node) {
          // 节点上创建是指在节点父级文件夹上创建
          // 临时查询secondary对应的只有数据库
          folderForm.current?.setFieldsValue({
            iid: currentInstances,
            parentId: currentFolder.parentId,
            primary: primary,
            secondary: SecondaryEnums.database,
          });
          return;
        }
        folderForm.current?.setFieldsValue({
          iid: currentInstances,
          parentId: currentFolder.id,
          primary: primary,
          secondary: SecondaryEnums.database,
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
  }, [currentFolder, visibleFolder]);

  useEffect(() => {
    if (!visibleFolder) {
      changeIsUpdateFolder(false);
      folderForm.current?.resetFields();
    }
  }, [visibleFolder]);

  const handleSubmit = (file: {
    iid: number;
    id: number;
    name: string;
    primary: number;
    secondary: number;
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
      secondary: file.secondary as number,
    };
    if (!isUpdateFolder) {
      doCreatedFolder.run(data).then((res: any) => {
        if (res.code == 0) {
          message.success(i18n.formatMessage({ id: "models.pms.create.suc" }));
          changeVisibleFolder(false);
          getDataList(currentInstances as number);
        }
      });
      return;
    }
    doUpdateFolder.run(data.id, data).then((res: any) => {
      if (res.code == 0) {
        message.success(i18n.formatMessage({ id: "models.pms.update.suc" }));
        changeVisibleFolder(false);
        getDataList(currentInstances as number);
      }
    });
  };
  return (
    <Modal
      confirmLoading={doCreatedFolder.loading || doUpdateFolder.loading}
      title={
        !isUpdateFolder
          ? i18n.formatMessage({
              id: "bigdata.components.FolderTree.crateFolder.createTitle",
            })
          : i18n.formatMessage({
              id: "bigdata.components.FolderTree.crateFolder.updateTitle",
            })
      }
      open={visibleFolder}
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
        <Form.Item name={"secondary"} label="secondary" hidden>
          <Select
            placeholder={i18n.formatMessage({
              id: "bigdata.components.FolderTree.crateFolder.secondary.placeholder",
            })}
          >
            {secondaryList.map(
              (item: { id: number; title: string; enum: number }) => (
                <Option value={item.enum} key={item.id}>
                  {item.title}
                </Option>
              )
            )}
          </Select>
        </Form.Item>
        <Form.Item
          name={"name"}
          label={i18n.formatMessage({
            id: "name",
          })}
          required
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={"desc"}
          label={i18n.formatMessage({
            id: "description",
          })}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreateAndUpdateFolder;
