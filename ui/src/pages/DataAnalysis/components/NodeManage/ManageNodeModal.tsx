import { Form, FormInstance, Input, Modal, Select } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { TertiaryList } from "@/models/dataanalysis/useManageNodeAndFolder";
import { TertiaryEnums } from "@/pages/DataAnalysis/service/enums";
import { DataSourceTypeEnums } from "@/pages/DataAnalysis/OfflineManager/config";

const { Option } = Select;

export interface ManageNodeModalType {
  // visibleNode: any;
  // callbackRef: any;
  // hideNodeModal: any;
  // isBoardCreateNode: any;
  // isEditNode: any;
  // // extra: any;
  // setCurrentNode: any;
  // currentNode: any;
}

const ManageNodeModal = (props: ManageNodeModalType) => {
  // const {
  //   visibleNode,
  //   callbackRef,
  //   hideNodeModal,
  //   isBoardCreateNode,
  //   isEditNode,
  //   // extra,
  //   setCurrentNode,
  //   currentNode,
  // } = props;
  const formRef = useRef<FormInstance>(null);
  const [sources, setSources] = useState<any[]>([]);
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
    doGetSqlSource,
    isBoardCreateNode,
    iid,
  } = useModel("dataAnalysis", (model) => ({
    doGetSqlSource: model.dataSourceManage.doGetSourceList,
    visibleNode: model.manageNode.visibleNode,
    isEditNode: model.manageNode.isEditNode,
    extra: model.manageNode.extra,
    doCreatedNode: model.manageNode.doCreatedNode,
    doUpdatedNode: model.manageNode.doUpdatedNode,
    callbackRef: model.manageNode.callbackRef,
    hideNodeModal: model.manageNode.hideNodeModal,
    setCurrentNode: model.manageNode.setCurrentNode,
    currentNode: model.manageNode.currentNode,
    isBoardCreateNode: model.manageNode.isBoardCreateNode,
    iid: model.currentInstances,
  }));

  const onCancel = () => hideNodeModal();

  const handleSubmit = (fields: any) => {
    isEditNode ? updateNode(fields) : addNode(fields);
  };

  const addNode = (fields: any) => {
    if (
      fields.tertiary === TertiaryEnums.start ||
      fields.tertiary === TertiaryEnums.end
    ) {
      callbackRef.current?.({
        id: `${TertiaryEnums[fields.tertiary]}-${extra.workflowId}-${
          fields.tertiary
        }`,
        ...extra,
        ...fields,
      });
      onCancel();
      return;
    }
    doCreatedNode.run({ ...fields, ...extra }).then((res) => {
      callbackRef.current?.(res?.data);
      onCancel();
    });
  };

  const updateNode = (fields: any) => {
    if (
      fields.tertiary === TertiaryEnums.start ||
      fields.tertiary === TertiaryEnums.end
    ) {
      callbackRef.current?.({ ...currentNode, ...fields });
      onCancel();
      return;
    }
    doUpdatedNode.run(extra.id, { ...fields, ...extra }).then(() => {
      callbackRef.current?.({ ...currentNode, ...fields });
      onCancel();
    });
  };

  const SourceOptions = useMemo(() => {
    return sources.map((item) => ({ value: item.id, label: item.name }));
  }, [sources]);

  useEffect(() => {
    if (!visibleNode || !formRef.current) return;
    formRef.current.setFieldsValue(extra);
  }, [visibleNode]);

  useEffect(() => {
    if (!visibleNode || !iid) return;
    doGetSqlSource.run({ iid, typ: DataSourceTypeEnums.MySQL }).then((res) => {
      if (res?.code !== 0) return;
      setSources(res.data);
    });
  }, [visibleNode, iid]);

  useEffect(() => {
    if (!visibleNode || !formRef.current || !isEditNode || !iid) return;
    formRef.current.setFieldsValue({
      name: currentNode.name,
      desc: currentNode.desc,
      sourceId: currentNode.sourceId,
    });
  }, [visibleNode, iid]);

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
          <Select placeholder="请选择tertiary" disabled={isBoardCreateNode}>
            {TertiaryList.filter((item) =>
              item.types.includes(extra?.secondary)
            ).map((item: { id: number; title: string; enum: number }) => (
              <Option value={item.enum} key={item.id}>
                {item.title}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, nextValues) =>
            prevValues.tertiary !== nextValues.tertiary
          }
        >
          {({ getFieldValue }) => {
            if (getFieldValue("tertiary") !== TertiaryEnums.mysql) {
              formRef.current?.resetFields(["sourceId"]);
              return null;
            }
            return (
              <Form.Item name={"sourceId"} label={"datasource"}>
                <Select options={SourceOptions} placeholder="请选择 source" />
              </Form.Item>
            );
          }}
        </Form.Item>
        <Form.Item name={"name"} label="name" required>
          <Input placeholder="请输入节点名称" />
        </Form.Item>
        <Form.Item name={"desc"} label="desc">
          <Input placeholder="请输入节点描述" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default ManageNodeModal;
