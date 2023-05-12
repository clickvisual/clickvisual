import { BigDataNavEnum } from "@/pages/DataAnalysis";
import {
  DataSourceReqTypEnums,
  FolderEnums,
  SecondaryEnums,
  TertiaryEnums,
} from "@/pages/DataAnalysis/service/enums";
import { Form, FormInstance, Input, message, Modal, Select } from "antd";
import { useEffect, useRef, useState } from "react";
import { useIntl, useModel } from "umi";

const { Option } = Select;

const CreateAndUpdateNode = () => {
  const i18n = useIntl();
  const folderForm = useRef<FormInstance>(null);
  const {
    currentInstances,
    temporaryQuery,
    navKey,
    doCreatedNode,
    doUpdateNode,
    doGetSourceList,
  } = useModel("dataAnalysis");

  const [sourceList, setSourceList] = useState<any[]>();
  const primary = navKey == BigDataNavEnum.TemporaryQuery ? 3 : 0;

  const {
    secondaryList,
    databaseTertiary,
    getDataList,
    currentFolder,
    isUpdateNode,
    visibleNode,
    changeVisibleNode,
    changeIsUpdateNode,
  } = temporaryQuery;

  useEffect(() => {
    if (visibleNode && currentFolder) {
      if (!isUpdateNode) {
        if (currentFolder.nodeType == FolderEnums.node) {
          // 节点上创建是指在节点父级文件夹上创建
          folderForm.current?.setFieldsValue({
            iid: currentInstances,
            folderId: currentFolder.parentId,
            primary: primary,
            secondary: SecondaryEnums.database,
          });
          return;
        }
        folderForm.current?.setFieldsValue({
          iid: currentInstances,
          folderId: currentFolder.id,
          primary: primary,
          secondary: SecondaryEnums.database,
        });
        return;
      }
      folderForm.current?.setFieldsValue({
        iid: currentInstances,
        id: currentFolder.id,
        folderId: currentFolder.parentId,
        primary: primary,
        name: currentFolder.name,
        desc: currentFolder.desc,
        secondary: currentFolder.secondary,
        sourceId: currentFolder.sourceId,
        tertiary: currentFolder.tertiary,
      });
      return;
    }
  }, [currentFolder, visibleNode]);

  const handleSubmit = (file: {
    iid: number;
    id: number;
    name: string;
    primary: number;
    secondary: number;
    tertiary: number;
    sourceId?: number;
    desc?: string;
    folderId?: number;
  }) => {
    let data: any = {
      id: file.id as number,
      folderId: file.folderId as number,
      name: file.name as string,
      desc: file.desc as string,
      tertiary: file.tertiary as number,
      sourceId: file.sourceId as number,
    };
    if (!isUpdateNode) {
      data = Object.assign(data, {
        iid: file.iid as number,
        primary: file.primary as number,
        secondary: file.secondary as number,
      });
      doCreatedNode.run(data).then((res: any) => {
        if (res.code == 0) {
          message.success(i18n.formatMessage({ id: "models.pms.create.suc" }));
          changeVisibleNode(false);
          getDataList(currentInstances as number);
        }
      });
      return;
    }
    doUpdateNode.run(data.id, data).then((res: any) => {
      if (res.code == 0) {
        message.success(i18n.formatMessage({ id: "models.pms.update.suc" }));
        changeVisibleNode(false);
        getDataList(currentInstances as number);
      }
    });
  };

  useEffect(() => {
    // if (folderForm.current?.getFieldValue("tertiary") == TertiaryEnums.mysql) {
    doGetSourceList
      .run({
        iid: currentInstances as number,
        typ: DataSourceReqTypEnums.mysql,
      })
      .then((res: any) => {
        if (res.code == 0) {
          setSourceList(res.data);
        }
      });
    // }
  }, [currentInstances]);

  useEffect(() => {
    if (!visibleNode) {
      changeIsUpdateNode(false);
      folderForm.current?.resetFields();
    }
  }, [visibleNode]);

  return (
    <Modal
      confirmLoading={doCreatedNode.loading || doUpdateNode.loading}
      title={
        !isUpdateNode
          ? i18n.formatMessage({
              id: "bigdata.components.FolderTree.crateNode.createTitle",
            })
          : i18n.formatMessage({
              id: "bigdata.components.FolderTree.crateNode.updateTitle",
            })
      }
      open={visibleNode}
      bodyStyle={{ paddingBottom: 0 }}
      onCancel={() => changeVisibleNode(false)}
      onOk={() => folderForm.current?.submit()}
    >
      <Form
        ref={folderForm}
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 14 }}
        onFinish={handleSubmit}
      >
        <Form.Item name={"id"} hidden>
          <Input type="number" />
        </Form.Item>
        <Form.Item name={"iid"} hidden>
          <Input />
        </Form.Item>
        <Form.Item name={"folderId"} hidden>
          <Input type="number" />
        </Form.Item>
        <Form.Item name={"primary"} hidden>
          <Input type="number" />
        </Form.Item>
        <Form.Item name={"secondary"} label="secondary" hidden>
          <Select>
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
          name={"tertiary"}
          label={i18n.formatMessage({
            id: "log.editDatabaseModel.label.datasourceType",
          })}
          required
        >
          <Select
            placeholder={i18n.formatMessage({
              id: "bigdata.components.FolderTree.crateNode.tertiarySelect.placeholder",
            })}
          >
            {databaseTertiary.map(
              (item: { id: number; title: string; enum: number }) => (
                <Option value={item.enum} key={item.id}>
                  {item.title}
                </Option>
              )
            )}
          </Select>
        </Form.Item>
        <Form.Item
          shouldUpdate={(prevValues, nextValues) =>
            prevValues.tertiary !== nextValues.tertiary
          }
          noStyle
        >
          {({ getFieldValue }) => {
            const tertiary = getFieldValue("tertiary");
            if (tertiary === TertiaryEnums.mysql) {
              return (
                <Form.Item
                  name={"sourceId"}
                  label="sourceId"
                  required={
                    folderForm.current?.getFieldValue("tertiary") ==
                    TertiaryEnums.mysql
                  }
                >
                  <Select
                    placeholder={i18n.formatMessage({
                      id: "bigdata.components.FolderTree.crateNode.sourceSelect.placeholder",
                    })}
                  >
                    {sourceList?.map((item: { id: number; name: string }) => (
                      <Option value={item.id} key={item.id}>
                        {item.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            }
            return <></>;
          }}
        </Form.Item>
        <Form.Item
          name={"name"}
          label={i18n.formatMessage({
            id: "name",
          })}
          required
        >
          <Input
            placeholder={i18n.formatMessage({
              id: "bigdata.components.FolderTree.crateNode.nodeName.placeholder",
            })}
          />
        </Form.Item>
        <Form.Item
          name={"desc"}
          label={i18n.formatMessage({
            id: "description",
          })}
        >
          <Input
            placeholder={i18n.formatMessage({
              id: "bigdata.components.FolderTree.crateNode.nodeDesc.placeholder",
            })}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreateAndUpdateNode;
