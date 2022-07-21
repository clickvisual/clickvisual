import styles from "./index.less";
import CustomCollapse from "./CustomCollapse";
import { Button, Drawer, Form, FormInstance, message, Space } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useModel, useIntl } from "umi";
import { SecondaryEnums } from "@/pages/DataAnalysis/service/enums";
import BasisConfig from "./BasisConfig";
import Parameter from "./Parameter";

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
  ];

  // 函数

  const onClose = () => {
    setVisible(false);
  };

  const handleSubmit = (file: {
    desc?: string;
    dutyUid: number;
    cron?: string;
    typ: number;
    args: { key: string; val: string }[];
  }) => {
    if (!isUpdate) {
      const data = {
        desc: file.desc,
        dutyUid: file.dutyUid,
        cron: file.cron,
        typ: Number(!file.typ),
        nodeId: selectNode.id,
        args: file.args,
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
      args: file.args,
    };
    doUpdateCrontab.run(selectNode.id, data).then((res: any) => {
      if (res.code == 0) {
        message.success(i18n.formatMessage({ id: "models.pms.update.suc" }));
        onClose();
      }
    });
  };

  // 副作用

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
              args: JSON.parse(data.args) || [{ key: "", val: "" }],
            });
            setIsUpdate(true);
            return;
          }
          CrontabFormRef.current?.setFieldsValue({
            args: [{ key: "", val: "" }],
          });
        }
      });
      return;
    }
    CrontabFormRef.current?.resetFields();
  }, [visible, selectNode?.id]);

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
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 18 }}
        ref={CrontabFormRef}
        onFinish={handleSubmit}
        labelAlign="left"
        labelWrap
      >
        {/* 基础配置 */}
        <CustomCollapse
          title={i18n.formatMessage({
            id: "bigdata.components.RightMenu.Scheduling.basicConfig",
          })}
        >
          <BasisConfig infoList={infoList} userList={userList} />
        </CustomCollapse>
        {/* 参数 */}
        <CustomCollapse
          title={i18n.formatMessage({
            id: "bigdata.components.RightMenu.Scheduling.Parameter.title",
          })}
        >
          <Parameter />
        </CustomCollapse>
      </Form>
    </Drawer>
  );
};
export default Scheduling;
