import {
  Button,
  Drawer,
  Form,
  FormInstance,
  Input,
  message,
  Select,
  Space,
  Spin,
} from "antd";
import InspectionFrequencyItem from "@/pages/Alarm/Rules/components/FormAlarmDraw/InspectionFrequencyItem";
import QueryStatisticsItem from "@/pages/Alarm/Rules/components/FormAlarmDraw/QueryStatisticsItem";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { useEffect, useRef, useState } from "react";
import MoreOptions from "@/pages/Alarm/Rules/components/FormAlarmDraw/TriggerConditionItem/MoreOptions";
import TextArea from "antd/es/input/TextArea";
import { SaveOutlined } from "@ant-design/icons";
import { AlarmRequest, ChannelType } from "@/services/alarm";
import CreateChannelModal from "@/pages/Alarm/Notifications/components/CreateChannelModal";

export enum AlarmLvelType {
  Alarm = 0,
  Notice = 1,
  Serious = 2,
}

const { Option } = Select;

const FormAlarmDraw = () => {
  const {
    alarmDraw,
    currentRowAlarm,
    doGetAlarms,
    onChangeRowAlarm,
    currentPagination,
    operations,
    alarmChannel,
    alarmChannelModal,
  } = useModel("alarm");
  const { doGetChannels } = alarmChannel;
  const { setVisibleCreate } = alarmChannelModal;
  const alarmFormRef = useRef<FormInstance>(null);
  const i18n = useIntl();
  const [channelList, setChannelList] = useState<ChannelType[]>([]);

  const alarmLvelList = [
    {
      key: AlarmLvelType.Alarm,
      name: i18n.formatMessage({ id: "alarm.rules.form.level.alarm" }),
    },

    {
      key: AlarmLvelType.Notice,
      name: i18n.formatMessage({ id: "alarm.rules.form.level.notice" }),
    },

    {
      key: AlarmLvelType.Serious,
      name: i18n.formatMessage({ id: "alarm.rules.form.level.serious" }),
    },
  ];

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
      doGetAlarms.run({
        ...operations.searchQuery,
        did: operations.searchQuery.tid
          ? undefined
          : operations.searchQuery.did,
        iid:
          operations.searchQuery.tid || operations.searchQuery.did
            ? undefined
            : operations.searchQuery.iid,
        ...currentPagination,
      });
      handleClose();
    });
  };
  const doUpdated = (field: AlarmRequest) => {
    if (!currentRowAlarm) return;
    alarmDraw.doUpdatedAlarm.run(currentRowAlarm.id, field).then((res) => {
      if (res?.code !== 0) return;
      doGetAlarms.run({
        ...operations.searchQuery,
        did: operations.searchQuery.tid
          ? undefined
          : operations.searchQuery.did,
        iid:
          operations.searchQuery.tid || operations.searchQuery.did
            ? undefined
            : operations.searchQuery.iid,
        ...currentPagination,
      });
      message.success(i18n.formatMessage({ id: "alarm.rules.updated" }));
      handleClose();
    });
  };

  const getChannelList = () => {
    doGetChannels.run().then((res) => {
      if (res?.code === 0) setChannelList(res.data);
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
    if (!alarmDraw.visibleDraw || !alarmDraw.isEditor || !currentRowAlarm) {
      return;
    }
    alarmDraw.doGetAlarmInfo.run(currentRowAlarm.id).then((res) => {
      if (res?.code !== 0 || !alarmFormRef.current) return;
      alarmFormRef.current.setFieldsValue({
        ...res.data,
        channelIds: res.data.channelIds ? res.data.channelIds : undefined,
      });
    });
  }, [alarmDraw.visibleDraw, alarmDraw.isEditor, currentRowAlarm]);

  useEffect(() => {
    if (alarmDraw.visibleDraw) getChannelList();
  }, [alarmDraw.visibleDraw]);

  return (
    <Drawer
      closable
      destroyOnClose
      title={i18n.formatMessage({ id: "alarm.rules.form.title" })}
      visible={alarmDraw.visibleDraw}
      placement="left"
      onClose={handleClose}
      getContainer={false}
      width={"55%"}
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
                max: 64,
              },
              {
                // pattern: new RegExp("^[a-zA-Z1-9_]*$"),
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
          <Form.Item
            label={i18n.formatMessage({
              id: "alarm.rules.form.level",
            })}
            name={"level"}
            required
          >
            <Select
              placeholder={i18n.formatMessage({
                id: "alarm.rules.form.placeholder.level",
              })}
            >
              {alarmLvelList.map((item: any) => {
                return (
                  <Option value={item.key} key={item.key}>
                    {item.name}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>
          <InspectionFrequencyItem />
          <Form.Item
            label={i18n.formatMessage({ id: "alarm.rules.form.serviceName" })}
            name={"service"}
            rules={[
              {
                required: true,
                message: i18n.formatMessage({
                  id: "alarm.rules.form.placeholder.serviceName",
                }),
              },
              {
                max: 64,
              },
              {
                // pattern: new RegExp("^[a-zA-Z1-9_]*$"),
                message: i18n.formatMessage({
                  id: "alarm.rules.form.rule.serviceName",
                }),
              },
            ]}
          >
            <Input
              placeholder={`${i18n.formatMessage({
                id: "alarm.rules.form.placeholder.serviceName",
              })}`}
            />
          </Form.Item>
          
          <Form.Item
            label={i18n.formatMessage({ id: "alarm.rules.form.mobiles" })}
            name={"mobiles"}
            rules={[
              {
                required: true,
                message: i18n.formatMessage({
                  id: "alarm.rules.form.placeholder.mobiles",
                }),
              },
              {
                max: 1024,
              },
              {
                // pattern: new RegExp("^[a-zA-Z1-9_]*$"),
                message: i18n.formatMessage({
                  id: "alarm.rules.form.rule.mobiles",
                }),
              },
            ]}
          >
            <Input
              placeholder={`${i18n.formatMessage({
                id: "alarm.rules.form.placeholder.mobiles",
              })}`}
            />
          </Form.Item>

          <QueryStatisticsItem formRef={alarmFormRef.current} />
          <MoreOptions />

          <Form.Item
            label={
              <Space>
                {i18n.formatMessage({
                  id: "alarm.rules.form.channelIds",
                })}
                <Button
                  size="small"
                  onClick={() => {
                    setVisibleCreate(true);
                  }}
                >
                  {i18n.formatMessage({ id: "alarm.notify.modal.created" })}
                </Button>
              </Space>
            }
            name={"channelIds"}
            rules={[
              {
                required: true,
                message: i18n.formatMessage({
                  id: "alarm.rules.form.placeholder.channelIds",
                }),
              },
            ]}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder={`${i18n.formatMessage({
                id: "alarm.rules.form.placeholder.channelIds",
              })}`}
            >
              {channelList.map((item) => (
                <Option key={item.id} value={item.id}>
                  {item.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
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
      <CreateChannelModal loadList={getChannelList} />
    </Drawer>
  );
};
export default FormAlarmDraw;
