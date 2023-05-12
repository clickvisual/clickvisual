import { CollectType } from "@/services/dataLogs";
import { Form, FormInstance, Input, message, Modal } from "antd";
import { useEffect, useRef } from "react";
import { useIntl, useModel } from "umi";

const creatCollectingHistorical = (props: {
  open: boolean;
  onChangeVisible: (flag: boolean) => void;
}) => {
  const i18n = useIntl();
  const { open, onChangeVisible } = props;
  const collectingHistoricalRef = useRef<FormInstance>(null);
  const {
    keywordInput,
    doCreateLogFilter,
    doGetLogFilterList,
    onChangeCollectingHistorical,
  } = useModel("dataLogs");

  const handleFinish = (file: any) => {
    file.collectType = CollectType.query;
    doCreateLogFilter.run(file).then((res: any) => {
      if (res.code != 0) return;
      message.success("success");
      onChangeVisible(false);
      const data = {
        collectType: CollectType.query,
      };
      doGetLogFilterList.run(data).then((res: any) => {
        if (res.code != 0) return;
        onChangeCollectingHistorical(res.data);
      });
    });
  };

  useEffect(() => {
    if (open) {
      collectingHistoricalRef.current?.setFieldsValue({
        statement: keywordInput,
      });
    } else {
      collectingHistoricalRef.current?.resetFields();
    }
  }, [open]);

  return (
    <Modal
      title={i18n.formatMessage({ id: "log.collectHistory.modal.title" })}
      open={open}
      onCancel={() => onChangeVisible(false)}
      onOk={() => collectingHistoricalRef.current?.submit()}
      width={800}
    >
      <Form
        ref={collectingHistoricalRef}
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 16 }}
        onFinish={handleFinish}
      >
        <Form.Item
          style={{ marginTop: "20px" }}
          rules={[{ required: true }]}
          label={i18n.formatMessage({ id: "log.collectHistory.modal.alias" })}
          name="alias"
        >
          <Input
            placeholder={i18n.formatMessage({
              id: "log.collectHistory.modal.alias.placeholder",
            })}
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "bigdata.components.RightMenu.VersionHistory.childDrawer.title",
          })}
          rules={[{ required: true }]}
          name="statement"
        >
          <Input.TextArea rows={8} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default creatCollectingHistorical;
