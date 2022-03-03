import { Button, Drawer, Form, FormInstance, Input, Space, Spin } from "antd";
import InspectionFrequencyItem from "@/pages/Alarm/Rules/components/FormAlarmDraw/InspectionFrequencyItem";
import QueryStatisticsItem from "@/pages/Alarm/Rules/components/FormAlarmDraw/QueryStatisticsItem";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { useEffect, useRef } from "react";
import TriggerConditionItem from "@/pages/Alarm/Rules/components/FormAlarmDraw/TriggerConditionItem";
import TextArea from "antd/es/input/TextArea";
import { SaveOutlined } from "@ant-design/icons";
import { AlarmRequest } from "@/services/alarm";

const FormAlarmDraw = () => {
  const {
    alarmDraw,
    currentRowAlarm,
    doGetAlarms,
    currentPagination,
    onChangeRowAlarm,
    operations,
  } = useModel("alarm");
  const alarmFormRef = useRef<FormInstance>(null);
  const i18n = useIntl();

  const searchQuery = {
    name: operations.inputName,
    did: operations.selectDid,
    tid: operations.selectTid,
    ...currentPagination,
  };

  const handleClose = () => {
    alarmDraw.onChangeVisibleDraw(false);
  };

  const handleOk = () => {
    if (!alarmFormRef.current) return;
    alarmFormRef.current.submit();
  };

  const doCreated = (field: AlarmRequest) => {
    alarmDraw.doCreatedAlarm.run(field).then((res) => {
      if (res?.code !== 0) return;
      doGetAlarms.run(searchQuery);
      handleClose();
    });
  };
  const doUpdated = (field: AlarmRequest) => {
    if (!currentRowAlarm) return;
    alarmDraw.doUpdatedAlarm.run(currentRowAlarm.id, field).then((res) => {
      if (res?.code !== 0) return;
      doGetAlarms.run(searchQuery);
      handleClose();
    });
  };

  const handleSubmit = (field: AlarmRequest) => {
    !alarmDraw.isEditor ? doCreated(field) : doUpdated(field);
  };

  useEffect(() => {
    if (!alarmDraw.visibleDraw && alarmFormRef.current) {
      alarmFormRef.current.resetFields();
      alarmDraw.isEditor && alarmDraw.onChangeIsEditor(false);
      currentRowAlarm && onChangeRowAlarm(undefined);
    }
  }, [alarmDraw.visibleDraw, alarmDraw.isEditor, currentRowAlarm]);

  useEffect(() => {
    if (!alarmDraw.visibleDraw || !alarmDraw.isEditor || !currentRowAlarm)
      return;
    alarmDraw.doGetAlarmInfo.run(currentRowAlarm.id).then((res) => {
      if (res?.code !== 0 || !alarmFormRef.current) return;
      alarmFormRef.current.setFieldsValue(res.data);
    });
  }, [alarmDraw.visibleDraw, alarmDraw.isEditor, currentRowAlarm]);

  return (
    <Drawer
      closable
      destroyOnClose
      title={i18n.formatMessage({ id: "alarm.rules.form.title" })}
      visible={alarmDraw.visibleDraw}
      placement="right"
      onClose={handleClose}
      getContainer={false}
      width={700}
      bodyStyle={{ padding: 10 }}
      headerStyle={{ padding: 10 }}
      extra={
        <Space>
          <Button onClick={handleClose}>
            {i18n.formatMessage({ id: "button.cancel" })}
          </Button>
          <Button
            loading={
              alarmDraw.doUpdatedAlarm.loading ||
              alarmDraw.doCreatedAlarm.loading
            }
            icon={<SaveOutlined />}
            type="primary"
            onClick={handleOk}
          >
            {i18n.formatMessage({ id: "button.save" })}
          </Button>
        </Space>
      }
    >
      <Spin spinning={alarmDraw.doGetAlarmInfo.loading}>
        <Form layout={"vertical"} ref={alarmFormRef} onFinish={handleSubmit}>
          <Form.Item
            label={i18n.formatMessage({ id: "alarm.rules.form.alarmName" })}
            name={"alarmName"}
            rules={[
              {
                required: true,
                message: i18n.formatMessage({
                  id: "alarm.rules.form.placeholder.alarmName",
                }),
              },
              {
                pattern: new RegExp("^[a-zA-Z1-9_]{0,64}$"),
                message: i18n.formatMessage({
                  id: "alarm.rules.form.rule.alarmName",
                }),
              },
            ]}
          >
            <Input
              placeholder={`${i18n.formatMessage({
                id: "alarm.rules.form.placeholder.alarmName",
              })}`}
            />
          </Form.Item>
          <InspectionFrequencyItem />
          <QueryStatisticsItem />
          <TriggerConditionItem />
          <Form.Item
            label={i18n.formatMessage({ id: "alarm.rules.form.description" })}
            name={"desc"}
          >
            <TextArea
              allowClear
              autoSize={{ minRows: 5, maxRows: 5 }}
              placeholder={`${i18n.formatMessage({
                id: "alarm.rules.form.placeholder.description",
              })}`}
            />
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  );
};
export default FormAlarmDraw;
