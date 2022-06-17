import instanceModalStyle from "@/pages/SystemSetting/InstancePanel/components/CreatedOrUpdatedInstanceModal/index.less";
import {
  Button,
  Cascader,
  Checkbox,
  Col,
  Form,
  FormInstance,
  Input,
  message,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tooltip,
} from "antd";
import { useDebounceFn } from "ahooks";
import type { InstanceType } from "@/services/systemSetting";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useRef, useState } from "react";
import { DEBOUNCE_WAIT } from "@/config/config";
import { useIntl } from "umi";
import {
  CaretDownOutlined,
  CaretRightOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { cloneDeep } from "lodash";
import classNames from "classnames";
import useAlarmStorages from "@/pages/SystemSetting/InstancePanel/hooks/useAlarmStorages";
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

  const { options, clusters, doGetClusters, doGetConfigMaps } =
    useModel("configure");
  const instanceFormRef = useRef<FormInstance>(null);
  const i18n = useIntl();
  const { AlarmStorages } = useAlarmStorages();

  const [moreOptionFlag, setMoreOptionFlag] = useState<boolean>(false);
  const [disabledSubmit, setDisabledSubmit] = useState<boolean>(true);

  const onChangeMoreOptionFlag = (flag: boolean) => {
    setMoreOptionFlag(flag);
  };

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
          setDisabledSubmit(false);
        }
      });
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  const { run } = useDebounceFn(onSubmit, { wait: DEBOUNCE_WAIT });

  const filter = (inputValue: string, path: any) => {
    return path.some(
      (option: any) =>
        option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
    );
  };

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
          if (cloneCurrent.ruleStoreType > 0) onChangeMoreOptionFlag(true);
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
      onChangeMoreOptionFlag(false);
      instanceFormRef.current?.resetFields();
      setDisabledSubmit(true);
    }
  }, [visible]);

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
          icon={<IconFont type={"icon-database-test"} />}
          loading={doTestInstance.loading}
          onClick={handleTest}
        >
          {i18n.formatMessage({ id: "button.test" })}
        </Button>,

        <Button
          key="submit"
          type={"primary"}
          disabled={disabledSubmit}
          icon={<SaveOutlined />}
          loading={doCreatedInstance.loading || doUpdatedInstance.loading}
          onClick={() => instanceFormRef.current?.submit()}
        >
          {i18n.formatMessage({ id: "button.ok" })}
        </Button>,
        disabledSubmit && (
          <Button type={"link"}>
            <Tooltip
              title={i18n.formatMessage({ id: "instance.form.test.tip" })}
            >
              <QuestionCircleOutlined />
            </Tooltip>
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
            disabled
          >
            <Option value={"ch"}>ClickHouse</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={i18n.formatMessage({ id: "instance.form.title.mode" })}
        >
          <Space>
            <Form.Item name={"mode"} noStyle valuePropName="checked">
              <Switch />
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
                  "tcp://127.0.0.1:9000?username=root&password=pass&read_timeout=10&write_timeout=20&debug=true",
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
        <Row>
          <Col
            span={4}
            className={classNames(
              instanceModalStyle.moreOptions,
              moreOptionFlag && instanceModalStyle.moreOptionsShow
            )}
          >
            <a
              onClick={() => {
                onChangeMoreOptionFlag(!moreOptionFlag);
              }}
            >
              {i18n.formatMessage({ id: "instance.form.moreOptions" })}
              {moreOptionFlag ? <CaretDownOutlined /> : <CaretRightOutlined />}
            </a>
          </Col>
        </Row>
        {moreOptionFlag && (
          <Form.Item noStyle>
            <Form.Item
              label={i18n.formatMessage({
                id: "instance.form.title.ruleStoreType",
              })}
            >
              <Space>
                <Tooltip
                  title={i18n.formatMessage({
                    id: "instance.form.title.ruleStoreType.tip",
                  })}
                >
                  <a>
                    <QuestionCircleOutlined />
                  </a>
                </Tooltip>
                <Form.Item noStyle name={"ruleStoreType"} initialValue={0}>
                  <Radio.Group>
                    {AlarmStorages.map((item) => (
                      <Radio value={item.value}>{item.label}</Radio>
                    ))}
                  </Radio.Group>
                </Form.Item>
              </Space>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, nextValues) =>
                prevValues.ruleStoreType !== nextValues.ruleStoreType
              }
            >
              {({ getFieldValue }) => {
                const type = getFieldValue("ruleStoreType");
                const content = (
                  <Form.Item
                    label={"Prometheus"}
                    name={"prometheusTarget"}
                    rules={[{ required: true }]}
                  >
                    <Input placeholder={"http://prometheus:9090"} />
                  </Form.Item>
                );
                switch (type) {
                  case 1:
                    return (
                      <>
                        {content}
                        <Form.Item
                          label={i18n.formatMessage({
                            id: "instance.form.title.filePath",
                          })}
                          name={"filePath"}
                          rules={[
                            {
                              required: true,
                              message: i18n.formatMessage({
                                id: "instance.form.placeholder.filePath",
                              }),
                            },
                          ]}
                        >
                          <Input
                            placeholder={`${i18n.formatMessage({
                              id: "instance.form.placeholder.filePath",
                            })}`}
                          />
                        </Form.Item>
                      </>
                    );
                  case 2:
                    return (
                      <>
                        {content}
                        <Form.Item
                          label={i18n.formatMessage({
                            id: "instance.form.title.cluster",
                          })}
                          name={"clusterId"}
                          rules={[
                            {
                              required: true,
                              message: i18n.formatMessage({
                                id: "config.selectedBar.cluster",
                              }),
                            },
                          ]}
                        >
                          <Select
                            placeholder={`${i18n.formatMessage({
                              id: "config.selectedBar.cluster",
                            })}`}
                            onChange={(val: number) => {
                              if (val) doGetConfigMaps(val);
                            }}
                            showSearch
                          >
                            {clusters.map((item) => (
                              <Option key={item.id} value={item.id as number}>
                                {item.clusterName}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item
                          label={"ConfigMap"}
                          name="k8sConfig"
                          rules={[
                            {
                              required: true,
                              message: i18n.formatMessage({
                                id: "instance.form.rule.configmap",
                              }),
                            },
                          ]}
                        >
                          <Cascader
                            options={options}
                            expandTrigger="hover"
                            placeholder={`${i18n.formatMessage({
                              id: "config.selectedBar.configmap",
                            })}`}
                            showSearch={{ filter }}
                          />
                        </Form.Item>
                      </>
                    );
                  default:
                    return <></>;
                }
              }}
            </Form.Item>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
export default CreatedOrUpdatedInstanceModal;
