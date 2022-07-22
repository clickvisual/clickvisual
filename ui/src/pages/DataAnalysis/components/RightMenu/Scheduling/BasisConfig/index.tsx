import styles from "../index.less";
import { Form, Input, Select, Switch, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { useIntl } from "umi";

const { Option } = Select;
const { TextArea } = Input;
export interface BasisConfigType {
  infoList: any;
  userList: any[];
}

const BasisConfig = (props: BasisConfigType) => {
  const i18n = useIntl();
  const { infoList, userList } = props;

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
          id: "bigdata.components.RightMenu.Scheduling.thoseResponsible",
        })}
        name="dutyUid"
        rules={[{ required: true, message: "Please Select your dutyUid!" }]}
      >
        <Select
          showSearch
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
          <Input />
        </Form.Item>
        <div className={styles.question}>
          <Tooltip
            title={i18n.formatMessage({
              id: "bigdata.components.RightMenu.Scheduling.cronTips",
            })}
          >
            <a
              target="blank"
              href="https://clickvisual.gocn.vip/clickvisual/03funcintro/bigdata.html#%E5%AE%9A%E6%97%B6%E4%BB%BB%E5%8A%A1%E6%89%A7%E8%A1%8C%E8%A7%84%E5%88%99"
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
    </div>
  );
};
export default BasisConfig;
