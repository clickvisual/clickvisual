import CustomModal from "@/components/CustomModal";
import { DEBOUNCE_WAIT } from "@/config/config";
import { InstanceType } from "@/services/systemSetting";
import { SaveOutlined } from "@ant-design/icons";
import { useModel } from "@umijs/max";
import { useDebounceFn } from "ahooks";
import { Button, Form, FormInstance, Input, Radio, Select } from "antd";
import { useEffect, useRef, useState } from "react";
import { useIntl } from "umi";
import databaseModalStyles from "./index.less";

const { Option } = Select;

enum CreateType {
  /**
   * 创建数据库
   */
  create = 0,
  /**
   * 接入已有数据库
   */
  access = 1,
}

const CreatedDatabaseModal = (props: { onGetList: any }) => {
  const { onGetList } = props;
  const {
    visibleCreatedDatabaseModal,
    onChangeCreatedDatabaseModal,
    createdDatabase,
    createDatabaseCurrentInstance,
    onChangeCreateDatabaseCurrentInstance,
  } = useModel("database");
  const { getLocalTables } = useModel("dataLogs");
  const { instanceList, getInstanceList } = useModel("instances");
  const databaseFormRef = useRef<FormInstance>(null);

  const [clustersList, setClustersList] = useState<any>([]);
  const [localTables, setLocalTables] = useState<any>([]);

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
      setClustersList(dataList[0].clusters);
    } else {
      setClustersList([]);
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
        type: CreateType.create,
      });
      getLocalTables.run(createDatabaseCurrentInstance).then((res: any) => {
        if (res.code != 0) return;
        setLocalTables(res.data || []);
      });
      fillCluster(createDatabaseCurrentInstance);
      onChangeCreateDatabaseCurrentInstance(undefined);
      return;
    }
  }, [visibleCreatedDatabaseModal, instanceList]);

  return (
    <CustomModal
      title={i18n.formatMessage({
        id: "global.database.add",
      })}
      open={visibleCreatedDatabaseModal}
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
            disabled
            onChange={fillCluster}
          >
            {instanceList.map((item: InstanceType, index: number) => (
              <Option key={index} value={item.id as number}>
                {item.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label={i18n.formatMessage({ id: "operation" })} name="type">
          <Radio.Group>
            <Radio value={CreateType.create}>
              {i18n.formatMessage({ id: "database.created.datalogs" })}
            </Radio>
            <Radio value={CreateType.access}>
              {i18n.formatMessage({ id: "database.access.datalogs" })}
            </Radio>
          </Radio.Group>
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

        <Form.Item shouldUpdate={(pre, next) => pre.type != next.type} noStyle>
          {({ getFieldValue, resetFields }) => {
            const type = getFieldValue("type");
            resetFields(["databaseName"]);

            if (type == CreateType.create) {
              return (
                <Form.Item
                  label={i18n.formatMessage({ id: "database.form.label.name" })}
                  name={"databaseName"}
                  labelCol={{ span: 5 }}
                  wrapperCol={{ span: 14 }}
                  rules={[
                    {
                      required: true,
                      message: i18n.formatMessage({
                        id: "database.form.placeholder.name",
                      }),
                    },
                    {
                      pattern: new RegExp(/^[a-z][a-z\d_]{0,31}$/),
                      message: i18n.formatMessage({
                        id: "database.form.reg.name",
                      }),
                    },
                  ]}
                >
                  <Input
                    placeholder={`${i18n.formatMessage({
                      id: "database.form.placeholder.name",
                    })}`}
                  />
                </Form.Item>
              );
            }
            if (type == CreateType.access) {
              return (
                <Form.Item
                  label={i18n.formatMessage({ id: "database.form.label.name" })}
                  name={"databaseName"}
                  labelCol={{ span: 5 }}
                  wrapperCol={{ span: 14 }}
                  required
                >
                  <Select
                    placeholder={`${i18n.formatMessage({
                      id: "database.form.select.placeholder.name",
                    })}`}
                  >
                    {localTables?.map((item: any) => {
                      return (
                        <Option key={item.name} value={item.name}>
                          {item.name}
                        </Option>
                      );
                    })}
                  </Select>
                </Form.Item>
              );
            }
            return <></>;
          }}
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "description" })}
          name={"desc"}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input
            placeholder={`${i18n.formatMessage(
              {
                id: "input.placeholder",
              },
              {
                name: i18n.formatMessage({ id: "description" }),
              }
            )}`}
          />
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
