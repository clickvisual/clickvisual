import {Button, Checkbox, Form, FormInstance, Input, message, Modal, Select, Space, Switch, Tooltip,} from "antd";
import {useDebounceFn} from "ahooks";
import type {InstanceType} from "@/services/systemSetting";
import {useModel} from "@@/plugin-model/useModel";
import {useEffect, useRef, useState} from "react";
import {DEBOUNCE_WAIT} from "@/config/config";
import {useIntl} from "umi";
import {MinusCircleOutlined, PlusOutlined, SaveOutlined,} from "@ant-design/icons";
import {cloneDeep} from "lodash";
import IconFont from "@/components/IconFont";

type CreatedOrUpdatedInstanceModalProps = {
  isEditor?: boolean;
  current?: InstanceType;
  visible: boolean;
  onCancel: () => void;
};
const { Option } = Select;

const CreatedOrUpdatedInstanceModal = (
  props: CreatedOrUpdatedInstanceModalProps
) => {
  const { visible, isEditor, current, onCancel } = props;
  const {
    doCreatedInstance,
    doUpdatedInstance,
    doGetInstanceList,
    doGetInstanceInfo,
    doTestInstance,
  } = useModel("instances");

  const { doGetClusters, doGetConfigMaps } = useModel("configure");
  const instanceFormRef = useRef<FormInstance>(null);
  const i18n = useIntl();
  const [disabledSubmit, setDisabledSubmit] = useState<boolean>(false);

  const onSubmit = (field: any) => {
    const params = {
      ...field,
      replicaStatus: field.replicaStatus ? 0 : 1,
      namespace: field?.k8sConfig?.[0],
      configmap: field?.k8sConfig?.[1],
      mode: field.mode * 1,
    };
    delete params.k8sConfig;
    if (!params.mode) {
      delete params.replicaStatus;
      delete params.clusters;
    }
    if (isEditor && current?.id) {
      doUpdatedInstance.run(current.id, params).then((res) => {
        if (res?.code === 0) doGetInstanceList();
      });
    } else {
      doCreatedInstance.run(params).then((res) => {
        if (res?.code === 0) doGetInstanceList();
      });
    }
    onCancel();
  };

  const handleTest = useDebounceFn(
    () => {
      const dsn = instanceFormRef.current?.getFieldValue("dsn");
      if (!dsn) {
        message.warning(
          i18n.formatMessage({ id: "instance.form.test.warning" })
        );
        return;
      }
      doTestInstance.run({ dsn }).then((res) => {
        if (res?.code === 0) {
          message.success(
            i18n.formatMessage({ id: "instance.form.test.success" })
          );
          setDisabledSubmit(false);
          return;
        }
        message.error(i18n.formatMessage({ id: "instance.form.test.fail" }));
      });
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  const { run } = useDebounceFn(onSubmit, { wait: DEBOUNCE_WAIT });

  useEffect(() => {
    if (visible && isEditor && current && current?.id) {
      doGetInstanceInfo.run(current.id).then((res: any) => {
        if (res.code == 0) {
          const cloneCurrent: any = cloneDeep(res.data);
          if (!cloneCurrent.configmap || cloneCurrent.configmap === "") {
            cloneCurrent.clusterId = undefined;
          }
          if (
            cloneCurrent.configmap &&
            cloneCurrent.namespace &&
            cloneCurrent.configmap !== "" &&
            cloneCurrent.namespace !== ""
          ) {
            doGetConfigMaps(cloneCurrent.clusterId);
            cloneCurrent.k8sConfig = [
              cloneCurrent.namespace,
              cloneCurrent.configmap,
            ];
          }
          cloneCurrent.replicaStatus === 0
            ? (cloneCurrent.replicaStatus = true)
            : (cloneCurrent.replicaStatus = false);
          instanceFormRef.current?.setFieldsValue(cloneCurrent);
        }
      });
    }
  }, [visible, isEditor, current, current?.id]);

  const formItemLayout = {
    labelCol: {
      xs: { span: 20 },
      sm: { span: 4 },
    },
    wrapperCol: {
      xs: { span: 24 },
      sm: { span: 20 },
    },
  };

  const formItemLayoutWithOutLabel = {
    wrapperCol: {
      xs: { span: 20, offset: 4 },
      sm: { span: 20, offset: 4 },
    },
  };

  const formItemLayoutBtnLabel = {
    wrapperCol: {
      xs: { span: 20, offset: 4 },
      sm: { span: 18, offset: 4 },
    },
  };

  useEffect(() => {
    if (!visible) {
      setDisabledSubmit(false);
      instanceFormRef.current?.resetFields();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || isEditor) return;
    setDisabledSubmit(true);
  }, [visible, isEditor]);

  useEffect(() => {
    if (visible) doGetClusters();
  }, [visible]);

  return (
    <Modal
      centered
      width={740}
      title={i18n.formatMessage({
        id: `instance.form.title.${!isEditor ? "created" : "edit"}`,
      })}
      maskClosable={false}
      onCancel={onCancel}
      visible={visible}
      footer={[
        <Button key="back" onClick={onCancel}>
          {i18n.formatMessage({ id: "button.cancel" })}
        </Button>,
        <Button
          key="test"
          type={disabledSubmit ? "primary" : "default"}
          icon={<IconFont type={"icon-database-test"} />}
          loading={doTestInstance.loading}
          onClick={handleTest}
        >
          {i18n.formatMessage({ id: "button.test" })}
        </Button>,
        disabledSubmit ? (
          <span style={{ marginLeft: "8px" }}>
            <Tooltip
              title={i18n.formatMessage({ id: "instance.form.test.tip" })}
            >
              <Button
                key="submit"
                disabled={disabledSubmit}
                icon={<SaveOutlined />}
                loading={doCreatedInstance.loading || doUpdatedInstance.loading}
                onClick={() => instanceFormRef.current?.submit()}
              >
                {i18n.formatMessage({ id: "button.ok" })}
              </Button>
            </Tooltip>
          </span>
        ) : (
          <Button
            key="submit"
            type={"primary"}
            disabled={disabledSubmit}
            icon={<SaveOutlined />}
            loading={doCreatedInstance.loading || doUpdatedInstance.loading}
            onClick={() => instanceFormRef.current?.submit()}
          >
            {i18n.formatMessage({ id: "button.ok" })}
          </Button>
        ),
      ]}
    >
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 18 }}
        ref={instanceFormRef}
        onFinish={run}
      >
        <Form.Item
          name={"name"}
          label={i18n.formatMessage({ id: "instance.instanceName" })}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "instance.form.placeholder.instanceName",
              }),
            },
          ]}
        >
          <Input
            placeholder={i18n.formatMessage({
              id: "instance.form.placeholder.instanceName",
            })}
            allowClear
          />
        </Form.Item>
        <Form.Item
          name={"datasource"}
          label={i18n.formatMessage({ id: "instance.datasource" })}
          initialValue={"ch"}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "instance.form.placeholder.datasource",
              }),
            },
          ]}
        >
          <Select
            placeholder={i18n.formatMessage({
              id: "instance.form.placeholder.datasource",
            })}
          >
            <Option value={"ch"}>ClickHouse</Option>
            <Option value={"databend"}>Databend</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={i18n.formatMessage({ id: "instance.form.title.mode" })}
        >
          <Space>
            <Form.Item
              name={"mode"}
              noStyle
              valuePropName="checked"
              initialValue={false}
            >
              <Switch
                onChange={(flag: boolean) => {
                  if (flag) {
                    instanceFormRef.current?.setFieldsValue({
                      clusters: [""],
                      replicaStatus: false,
                    });
                  }
                }}
              />
            </Form.Item>
            <Form.Item
              shouldUpdate={(prevValues, nextValues) =>
                prevValues.mode !== nextValues.mode
              }
              noStyle
            >
              {({ getFieldValue }) => (
                <span>
                  {getFieldValue("mode")
                    ? i18n.formatMessage({
                        id: "instance.form.title.cluster",
                      })
                    : i18n.formatMessage({
                        id: "instance.form.title.modeType.single",
                      })}
                </span>
              )}
            </Form.Item>
          </Space>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, nextValues) =>
            prevValues.mode !== nextValues.mode
          }
        >
          {({ getFieldValue }) => {
            const mode = getFieldValue("mode");
            if (!mode) {
              return <></>;
            }
            return (
              <>
                <Form.Item
                  label={i18n.formatMessage({
                    id: "instance.form.title.replicaStatus",
                  })}
                  valuePropName="checked"
                  name={"replicaStatus"}
                  initialValue={false}
                >
                  <Checkbox />
                </Form.Item>
                <Form.List name="clusters">
                  {(fields, { add, remove }, { errors }) => {
                    return (
                      <>
                        {fields.map((field, index) => (
                          <Form.Item
                            key={field.key}
                            {...(index === 0
                              ? formItemLayout
                              : formItemLayoutWithOutLabel)}
                            required
                            label={
                              index === 0
                                ? i18n.formatMessage({
                                    id: "instance.form.title.cluster",
                                  })
                                : ""
                            }
                          >
                            <Form.Item
                              {...field}
                              validateTrigger={["onChange", "onBlur"]}
                              rules={[
                                {
                                  required: true,
                                  whitespace: true,
                                  message: i18n.formatMessage({
                                    id: "instance.form.placeholder.clusterName",
                                  }),
                                },
                              ]}
                              noStyle
                            >
                              <Input
                                placeholder={i18n.formatMessage({
                                  id: "instance.form.placeholder.clusterName",
                                })}
                                style={{ width: "90%", marginRight: "10px" }}
                              />
                            </Form.Item>
                            {fields.length > 1 ? (
                              <MinusCircleOutlined
                                className="dynamic-delete-button"
                                onClick={() => remove(field.name)}
                              />
                            ) : null}
                          </Form.Item>
                        ))}
                        <Form.Item {...formItemLayoutBtnLabel}>
                          <Button
                            type="dashed"
                            onClick={() => add()}
                            style={{ width: "100%" }}
                            icon={<PlusOutlined />}
                          >
                            {i18n.formatMessage({ id: "cluster.button.add" })}
                          </Button>
                          <Form.ErrorList errors={errors} />
                        </Form.Item>
                      </>
                    );
                  }}
                </Form.List>
              </>
            );
          }}
        </Form.Item>

        <Form.Item
          name={"dsn"}
          label={"DSN"}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "instance.form.rule.dsn",
              }),
            },
          ]}
        >
          <Input.TextArea
            placeholder={i18n.formatMessage(
              { id: "instance.form.placeholder.dsn" },
              {
                example:
                  "clickhouse://username:password@host1:9000,host2:9000/database?dial_timeout=200ms&max_execution_time=60",
              }
            )}
            onChange={() => setDisabledSubmit(true)}
            autoSize={{ minRows: 5, maxRows: 5 }}
            allowClear
          />
        </Form.Item>
        <Form.Item
          name={"desc"}
          label={i18n.formatMessage({ id: "DescAsAlias" })}
        >
          <Input
            placeholder={i18n.formatMessage({
              id: "datasource.logLibrary.from.newLogLibrary.desc.placeholder",
            })}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreatedOrUpdatedInstanceModal;
