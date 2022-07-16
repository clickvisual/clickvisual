import styles from "./index.less";
// import { CrontabTyp } from "@/services/dataAnalysis";
import CustomCollapse from "./CustomCollapse";
import {
  Button,
  Drawer,
  Form,
  FormInstance,
  Input,
  message,
  Select,
  Space,
  Switch,
  Tooltip,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useModel, useIntl } from "umi";
import { SecondaryEnums } from "@/pages/DataAnalysis/service/enums";
import { QuestionCircleOutlined } from "@ant-design/icons";

const { Option } = Select;
const { TextArea } = Input;

// const crontabList = [
//   {
//     value: CrontabTyp.Normal,
//     title: "正常执行",
//   },
//   {
//     value: CrontabTyp.Suspended,
//     title: "停止执行",
//   },
// ];

const Scheduling = (props: {
  visible: boolean;
  setVisible: (flag: boolean) => void;
}) => {
  const i18n = useIntl();
  const { visible, setVisible } = props;
  const [isUpdate, setIsUpdate] = useState<boolean>(false);
  const {
    doGetCrontabInfo,
    doCreatCrontab,
    doUpdateCrontab,
    userList,
    getUserList,
    manageNode,
  } = useModel("dataAnalysis");
  const { selectNode } = manageNode;
  const CrontabFormRef = useRef<FormInstance>(null);

  const onClose = () => {
    setVisible(false);
  };

  useEffect(() => {
    getUserList();
  }, []);

  useEffect(() => {
    if (visible && selectNode) {
      doGetCrontabInfo.run(selectNode.id).then((res: any) => {
        if (res?.code == 0) {
          const { data } = res;
          if (data != null) {
            CrontabFormRef.current?.setFieldsValue({
              dutyUid: data.dutyUid,
              desc: data.desc,
              cron: data.cron,
              typ: !Boolean(data.typ),
              uid: data.uid,
            });
            setIsUpdate(true);
            return;
          }
        }
      });
      return;
    }
    CrontabFormRef.current?.resetFields();
  }, [visible, selectNode?.id]);

  const secondary = useMemo(() => {
    switch (selectNode?.secondary) {
      case SecondaryEnums.all:
        return i18n.formatMessage({
          id: "bigdata.components.RightMenu.Scheduling.secondary.all",
        });
      case SecondaryEnums.database:
        return i18n.formatMessage({
          id: "datasource.draw.table.datasource",
        });
      case SecondaryEnums.dataIntegration:
        return i18n.formatMessage({
          id: "bigdata.components.RightMenu.Scheduling.secondary.dataIntegration",
        });
      case SecondaryEnums.dataMining:
        return i18n.formatMessage({
          id: "bigdata.components.RightMenu.Scheduling.secondary.dataMining",
        });
      case SecondaryEnums.board:
        return i18n.formatMessage({
          id: "bigdata.components.RightMenu.Scheduling.secondary.board",
        });
      case SecondaryEnums.universal:
        return i18n.formatMessage({
          id: "bigdata.components.RightMenu.Scheduling.secondary.universal",
        });
      default:
        break;
    }
    return;
  }, [selectNode?.secondary]);

  const infoList: any[] = [
    {
      id: 101,
      title: i18n.formatMessage({
        id: "bigdata.components.RightMenu.Scheduling.name",
      }),
      content: selectNode?.name,
    },
    {
      id: 102,
      title: i18n.formatMessage({
        id: "bigdata.components.RightMenu.Scheduling.nodeType",
      }),
      content: secondary,
    },
    // {
    //   id: 101,
    //   title: "名称",
    //   content: selectNode?.name,
    // },
  ];

  const handleSubmit = (file: {
    desc?: string;
    dutyUid: number;
    cron?: string;
    typ: number;
  }) => {
    if (!isUpdate) {
      const data = {
        desc: file.desc,
        dutyUid: file.dutyUid,
        cron: file.cron,
        typ: Number(!file.typ),
        nodeId: selectNode.id,
      };
      doCreatCrontab.run(data).then((res: any) => {
        if (res.code == 0) {
          message.success(i18n.formatMessage({ id: "models.pms.create.suc" }));
          onClose();
        }
      });
      return;
    }
    const data = {
      desc: file.desc,
      dutyUid: file.dutyUid,
      cron: file.cron,
      typ: Number(!file.typ),
    };
    doUpdateCrontab.run(selectNode.id, data).then((res: any) => {
      if (res.code == 0) {
        message.success(i18n.formatMessage({ id: "models.pms.update.suc" }));
        onClose();
      }
    });
  };

  return (
    <Drawer
      title={i18n.formatMessage({
        id: "bigdata.components.RightMenu.properties",
      })}
      placement="right"
      onClose={onClose}
      visible={visible}
      width={"50vw"}
      className={styles.drawer}
      extra={
        <Space>
          <Button
            type="primary"
            loading={
              doUpdateCrontab.loading ||
              doCreatCrontab.loading ||
              doGetCrontabInfo.loading
            }
            onClick={() => CrontabFormRef.current?.submit()}
          >
            {isUpdate
              ? i18n.formatMessage({
                  id: "bigdata.components.RightMenu.Scheduling.Modify",
                })
              : i18n.formatMessage({ id: "create" })}
          </Button>
        </Space>
      }
    >
      <CustomCollapse
        title={i18n.formatMessage({
          id: "bigdata.components.RightMenu.Scheduling.basicConfig",
        })}
      >
        <div className={styles.basicInfo}>
          {infoList.map((item: any) => {
            return (
              <div className={styles.infoItem} key={item.id}>
                <div className={styles.infoTitle}>{item.title}: </div>
                <div className={styles.infoContent}>{item.content}</div>
              </div>
            );
          })}
          <Form
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 18 }}
            ref={CrontabFormRef}
            onFinish={handleSubmit}
            labelAlign="left"
            labelWrap
          >
            <Form.Item
              valuePropName="checked"
              label={i18n.formatMessage({
                id: "bigdata.components.RightMenu.Scheduling.isPerform",
              })}
              name="typ"
            >
              <Switch />
              {/* <Select>
          {crontabList.map((item: any) => {
            return (
              <Option value={item.value} key={item.value}>
                {item.title}
              </Option>
            );
          })}
        </Select> */}
            </Form.Item>
            <Form.Item
              label={i18n.formatMessage({
                id: "bigdata.components.RightMenu.Scheduling.thoseResponsible",
              })}
              name="dutyUid"
              rules={[
                { required: true, message: "Please Select your dutyUid!" },
              ]}
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
            <Form.Item
              label={i18n.formatMessage({ id: "description" })}
              name="desc"
            >
              <TextArea
                placeholder={i18n.formatMessage({
                  id: "datasource.logLibrary.from.newLogLibrary.desc.placeholder",
                })}
              />
            </Form.Item>
          </Form>
        </div>
      </CustomCollapse>
    </Drawer>
  );
};
export default Scheduling;
