import databaseModalStyles from "./index.less";
import { Button, Form, FormInstance, Input, Select } from "antd";
import { useIntl } from "umi";
import { useEffect, useRef, useState } from "react";
import CustomModal from "@/components/CustomModal";
import { useModel } from "@@/plugin-model/useModel";
import { SaveOutlined } from "@ant-design/icons";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
import { InstanceType } from "@/services/systemSetting";

const { Option } = Select;

const CreatedDatabaseModal = (props: { onGetList: any }) => {
  const { onGetList } = props;
  const {
    visibleCreatedDatabaseModal,
    onChangeCreatedDatabaseModal,
    createdDatabase,
    createDatabaseCurrentInstance,
    onChangeCreateDatabaseCurrentInstance,
  } = useModel("database");
  const { instanceList, getInstanceList } = useModel("instances");
  const databaseFormRef = useRef<FormInstance>(null);

  const [clustersList, steClustersList] = useState<any>([]);

  const i18n = useIntl();

  const onCancel = () => {
    onChangeCreatedDatabaseModal(false);
  };

  const onOk = useDebounceFn(
    (field) => {
      createdDatabase.run(field.iid, field).then((res) => {
        if (res?.code === 0) {
          onChangeCreatedDatabaseModal(false);
          onGetList();
        }
      });
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  const fillCluster = (iid: number) => {
    const dataList = instanceList.filter((item) => item.id == iid);

    if (dataList[0]?.mode == 1) {
      steClustersList(dataList[0].clusters);
    } else {
      steClustersList([]);
    }
  };

  useEffect(() => {
    if (!visibleCreatedDatabaseModal) {
      databaseFormRef.current?.resetFields();
      return;
    }
    if (instanceList?.length == 0) {
      getInstanceList.run();
    }
  }, [visibleCreatedDatabaseModal]);

  useEffect(() => {
    if (
      visibleCreatedDatabaseModal &&
      createDatabaseCurrentInstance &&
      instanceList.length > 0
    ) {
      databaseFormRef.current?.setFieldsValue({
        iid: createDatabaseCurrentInstance,
      });
      fillCluster(createDatabaseCurrentInstance);
      onChangeCreateDatabaseCurrentInstance(undefined);
      return;
    }
  }, [visibleCreatedDatabaseModal, instanceList]);

  return (
    <CustomModal
      title={i18n.formatMessage({
        id: "database.form.title",
      })}
      visible={visibleCreatedDatabaseModal}
      onCancel={onCancel}
      width={"45%"}
    >
      <Form
        ref={databaseFormRef}
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 14 }}
        onFinish={onOk}
      >
        <Form.Item
          label={i18n.formatMessage({ id: "datasource.draw.table.instance" })}
          name={"iid"}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "datasource.draw.selected",
              }),
            },
          ]}
        >
          <Select
            style={{ width: "100%" }}
            placeholder={`${i18n.formatMessage({
              id: "datasource.draw.selected",
            })}`}
            onChange={fillCluster}
          >
            {instanceList.map((item: InstanceType, index: number) => (
              <Option key={index} value={item.id as number}>
                {item.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "database.form.label.name" })}
          name={"databaseName"}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "database.form.placeholder.name",
              }),
            },
            {
              pattern: new RegExp(/^[a-z][a-z\d_]{0,31}$/),
              message: i18n.formatMessage({ id: "database.form.reg.name" }),
            },
          ]}
        >
          <Input
            placeholder={`${i18n.formatMessage({
              id: "database.form.placeholder.name",
            })}`}
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "instance.form.title.cluster" })}
          name={"cluster"}
          hidden={!clustersList.length}
          rules={
            !clustersList.length
              ? []
              : [
                  {
                    required: true,
                    message: i18n.formatMessage({
                      id: "config.selectedBar.cluster",
                    }),
                  },
                ]
          }
        >
          <Select
            style={{ width: "100%" }}
            placeholder={`${i18n.formatMessage({
              id: "config.selectedBar.cluster",
            })}`}
          >
            {clustersList.map((item: string, index: number) => (
              <Option key={index} value={item}>
                {item}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item noStyle>
          <div className={databaseModalStyles.submitBtn}>
            <Button
              loading={createdDatabase.loading}
              type={"primary"}
              htmlType={"submit"}
              icon={<SaveOutlined />}
            >
              {i18n.formatMessage({ id: "submit" })}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </CustomModal>
  );
};
export default CreatedDatabaseModal;
