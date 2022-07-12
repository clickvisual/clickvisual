import styles from "./index.less";
// import { CrontabTyp } from "@/services/dataAnalysis";
import CustomCollapse from "./CustomCollapse";
import {
  Button,
  Drawer,
  Form,
  FormInstance,
  Input,
  Select,
  Space,
  Switch,
  Tooltip,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useModel } from "umi";
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
    if (visible && selectNode) {
      console.log(selectNode);
      getUserList();
      doGetCrontabInfo.run(selectNode.id).then((res: any) => {
        if (res?.code == 0) {
          const { data } = res;
          if (data) {
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
        return "任意";
      case SecondaryEnums.board:
        return "看板";
      case SecondaryEnums.dataIntegration:
        return "数据集成";
      case SecondaryEnums.dataMining:
        return "数据开发";
      case SecondaryEnums.universal:
        return "通用节点";
      default:
        break;
    }
    return;
  }, [selectNode?.secondary]);

  const infoList: any[] = [
    {
      id: 101,
      title: "名称",
      content: selectNode?.name,
    },
    {
      id: 102,
      title: "节点类型",
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
      doCreatCrontab.run(data);
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
        console.log(res.data);
      }
    });
  };

  return (
    <Drawer
      title="调度配置"
      placement="right"
      onClose={onClose}
      visible={visible}
      width={"40vw"}
      className={styles.drawer}
      extra={
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button
            type="primary"
            onClick={() => CrontabFormRef.current?.submit()}
          >
            {isUpdate ? "修改" : "新建"}
          </Button>
        </Space>
      }
    >
      <CustomCollapse title="基础配置">
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
          >
            <Form.Item valuePropName="checked" label="是否执行" name="typ">
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
            <Form.Item label={"责任人"} name="dutyUid" required>
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
            <Form.Item label={"cron"}>
              <Form.Item name="cron" noStyle>
                <Input />
              </Form.Item>
              <div className={styles.question}>
                <Tooltip title="调度规则 cron 字段填写 帮助文档">
                  <a
                    target="blank"
                    href="https://clickvisual.gocn.vip/clickvisual/03funcintro/bigdata.html#%E5%AE%9A%E6%97%B6%E4%BB%BB%E5%8A%A1%E6%89%A7%E8%A1%8C%E8%A7%84%E5%88%99"
                  >
                    <QuestionCircleOutlined />
                  </a>
                </Tooltip>
              </div>
            </Form.Item>
            <Form.Item label={"描述"} name="desc">
              <TextArea placeholder="请输入描述" />
            </Form.Item>
          </Form>
        </div>
      </CustomCollapse>
    </Drawer>
  );
};
export default Scheduling;
