import { Form, FormInstance, Input, message, Modal, Select, Spin } from "antd";
import { useEffect, useRef, useState } from "react";
import { useIntl, useModel } from "umi";

const { Option } = Select;

const AssociatLogLibraries = (props: { onGetList: any }) => {
  const { onGetList } = props;
  const i18n = useIntl();
  const {
    isAssociatedLinkLogLibrary,
    onChangeIsAssociatedLinkLogLibrary,
    doUpdateLinkLinkLogLibrary,
    linkLinkLogLibrary,
    doGetLinkLogLibraryList,
  } = useModel("dataLogs");
  const editLinkFormRef = useRef<FormInstance>(null);
  const [linkLogLibraryList, setLinkLogLibraryList] = useState<
    {
      id: number;
      did: number;
      desc: string;
      createType: number;
      tableName: string;
    }[]
  >([]);

  const handleSubmit = (file: { storageId: number; traceTableId: number }) => {
    doUpdateLinkLinkLogLibrary.run(file).then((res: any) => {
      if (res.code != 0) return;
      onChangeIsAssociatedLinkLogLibrary(false);
      message.success("success");
      onGetList();
    });
  };

  useEffect(() => {
    if (isAssociatedLinkLogLibrary) {
      editLinkFormRef.current?.setFieldsValue({
        storageId: linkLinkLogLibrary?.id,
      });
    } else {
      editLinkFormRef.current?.resetFields();
    }
  }, [isAssociatedLinkLogLibrary]);

  useEffect(() => {
    doGetLinkLogLibraryList.run().then((res: any) => {
      if (res.code != 0) return;
      setLinkLogLibraryList(res?.data);
    });
  }, []);

  return (
    <Modal
      title={i18n.formatMessage({ id: "datasource.tooltip.icon.link" })}
      open={isAssociatedLinkLogLibrary}
      onCancel={() => onChangeIsAssociatedLinkLogLibrary(false)}
      onOk={() => editLinkFormRef.current?.submit()}
      width={600}
      confirmLoading={
        doUpdateLinkLinkLogLibrary.loading || doUpdateLinkLinkLogLibrary.loading
      }
    >
      <Form
        ref={editLinkFormRef}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 12 }}
        onFinish={handleSubmit}
      >
        <Spin spinning={doUpdateLinkLinkLogLibrary.loading}>
          <Form.Item name={"storageId"} hidden>
            <Input />
          </Form.Item>
          <Form.Item
            label={i18n.formatMessage({
              id: "log.associatLogLibraries.storageId",
            })}
            required
          >
            <Input
              disabled
              value={linkLinkLogLibrary?.tableName}
              bordered={false}
            />
          </Form.Item>
          <Form.Item
            label={i18n.formatMessage({
              id: "log.associatLogLibraries.traceTableId",
            })}
            name={"traceTableId"}
            rules={[
              { required: true, message: "Please select your traceTableId!" },
            ]}
          >
            <Select allowClear placeholder={"Please select your traceTableId!"}>
              {linkLogLibraryList.map((item: any) => {
                return (
                  <Option key={item.id} value={item.id}>
                    {item.tableName}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>
        </Spin>
      </Form>
    </Modal>
  );
};
export default AssociatLogLibraries;
