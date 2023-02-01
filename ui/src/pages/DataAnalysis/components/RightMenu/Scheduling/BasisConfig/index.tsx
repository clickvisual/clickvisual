import styles from "../index.less";
import {Button, Form, Input, Select, Switch, Tooltip} from "antd";
import {QuestionCircleOutlined} from "@ant-design/icons";
import {useIntl, useModel} from "umi";
import {useEffect, useState} from "react";
import {ChannelType} from "@/services/alarm";
import CreateChannelModal from "@/pages/Alarm/Notifications/components/CreateChannelModal";

const { Option } = Select;
const { TextArea } = Input;
export interface BasisConfigType {
  infoList: any;
  userList: any[];
  visible: boolean;
}

const BasisConfig = (props: BasisConfigType) => {
  const i18n = useIntl();
  const { infoList, userList, visible } = props;
  const [channelList, setChannelList] = useState<ChannelType[]>([]);
  const { alarmChannel, alarmChannelModal } = useModel("alarm");
  const { doGetChannels } = alarmChannel;
  const { setVisibleCreate } = alarmChannelModal;

  const getChannelList = () => {
    doGetChannels.run().then((res) => {
      if (res?.code === 0) setChannelList(res.data);
    });
  };

  useEffect(() => {
    if (visible) getChannelList();
  }, [visible]);

  return (
    <div className={styles.basicInfo}>
      {infoList.map((item: any) => {
        return (
          <div className={styles.infoItem} key={item.id}>
            <div className={styles.infoTitle}>{item.title}: </div>
            <div className={styles.infoContent}>{item.content}</div>
          </div>
        );
      })}
      <Form.Item
        valuePropName="checked"
        label={i18n.formatMessage({
          id: "bigdata.components.RightMenu.Scheduling.isPerform",
        })}
        name="typ"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        label={i18n.formatMessage({
          id: "bigdata.components.RightMenu.Scheduling.channelIds",
        })}
      >
        <Form.Item name={"channelIds"} noStyle>
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
        <Button
          size="small"
          onClick={() => {
            setVisibleCreate(true);
          }}
          style={{ marginLeft: "15px" }}
        >
          {i18n.formatMessage({ id: "alarm.notify.modal.created" })}
        </Button>
      </Form.Item>
      <Form.Item
        label={i18n.formatMessage({
          id: "bigdata.components.RightMenu.Scheduling.thoseResponsible",
        })}
        name="dutyUid"
        rules={[{ required: true, message: "Please Select your dutyUid!" }]}
      >
        <Select
          showSearch
          placeholder={`${i18n.formatMessage(
            {
              id: "select.placeholder",
            },
            {
              name: i18n.formatMessage({
                id: "bigdata.components.RightMenu.Scheduling.thoseResponsible",
              }),
            }
          )}`}
          filterOption={(input, option) =>
            (option!.children as unknown as string)
              .toLowerCase()
              .includes(input.toLowerCase())
          }
        >
          {userList.map((item: any) => {
            return (
              <Option key={item.id} value={item.id}>
                {item.username}
              </Option>
            );
          })}
        </Select>
      </Form.Item>
      <Form.Item label={"cron"} required>
        <Form.Item
          name="cron"
          noStyle
          rules={[{ required: true, message: "Please input your cron!" }]}
        >
          <Input
            placeholder={`${i18n.formatMessage(
              {
                id: "input.placeholder",
              },
              {
                name: "cron",
              }
            )}`}
          />
        </Form.Item>
        <div className={styles.question}>
          <Tooltip
            title={i18n.formatMessage({
              id: "bigdata.components.RightMenu.Scheduling.cronTips",
            })}
          >
            <a
              target="blank"
              href="https://clickvisual.gocn.vip/zh/clickvisual/03funcintro/bigdata.html#%E5%AE%9A%E6%97%B6%E4%BB%BB%E5%8A%A1%E6%89%A7%E8%A1%8C%E8%A7%84%E5%88%99"
            >
              <QuestionCircleOutlined />
            </a>
          </Tooltip>
        </div>
      </Form.Item>
      <Form.Item label={i18n.formatMessage({ id: "description" })} name="desc">
        <TextArea
          placeholder={i18n.formatMessage({
            id: "datasource.logLibrary.from.newLogLibrary.desc.placeholder",
          })}
        />
      </Form.Item>
      <CreateChannelModal loadList={getChannelList} />
    </div>
  );
};
export default BasisConfig;
