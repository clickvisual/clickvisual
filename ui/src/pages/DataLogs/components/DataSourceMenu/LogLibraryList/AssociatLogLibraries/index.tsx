import { Form, FormInstance, Input, InputNumber, Modal, Spin } from "antd";
import { useEffect, useRef } from "react";
import { useIntl, useModel } from "umi";

const AssociatLogLibraries = (props: { onGetList: any }) => {
  const { onGetList } = props;
  const i18n = useIntl();
  const {
    isAssociatedLinkLogLibrary,
    onChangeIsAssociatedLinkLogLibrary,
    doUpdateLinkLinkLogLibrary,
    linkLinkLogLibraryTId,
  } = useModel("dataLogs");
  const editLinkFormRef = useRef<FormInstance>(null);

  const handleSubmit = (file: { storageId: number; traceTableId: number }) => {
    doUpdateLinkLinkLogLibrary.run(file).then((res: any) => {
      if (res.code != 0) return;
      onChangeIsAssociatedLinkLogLibrary(false);
      onGetList();
    });
  };

  useEffect(() => {
    if (isAssociatedLinkLogLibrary) {
      editLinkFormRef.current?.setFieldsValue({
        storageId: linkLinkLogLibraryTId,
      });
    } else {
      editLinkFormRef.current?.resetFields();
    }
  }, [isAssociatedLinkLogLibrary]);

  return (
    <Modal
      title={i18n.formatMessage({ id: "datasource.tooltip.icon.link" })}
      visible={isAssociatedLinkLogLibrary}
      onCancel={() => onChangeIsAssociatedLinkLogLibrary(false)}
      onOk={() => editLinkFormRef.current?.submit()}
      width={600}
      confirmLoading={
        doUpdateLinkLinkLogLibrary.loading || doUpdateLinkLinkLogLibrary.loading
      }
    >
      <Form
        ref={editLinkFormRef}
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 14 }}
        onFinish={handleSubmit}
      >
        <Spin spinning={doUpdateLinkLinkLogLibrary.loading}>
          <Form.Item label={"Table id"} name={"storageId"} required>
            <Input disabled />
          </Form.Item>
          <Form.Item
            label="链接的链路表id"
            name={"traceTableId"}
            rules={[
              { required: true, message: "Please input your storageId!" },
            ]}
          >
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Spin>
      </Form>
    </Modal>
  );
};
export default AssociatLogLibraries;
