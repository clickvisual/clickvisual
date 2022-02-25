import instanceModalStyle from "@/pages/SystemSetting/InstancePanel/components/CreatedOrUpdatedInstanceModal/index.less";
import {
  Cascader,
  Col,
  Form,
  FormInstance,
  Input,
  Modal,
  Row,
  Select,
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
  SaveOutlined,
} from "@ant-design/icons";
import { cloneDeep } from "lodash";
import classNames from "classnames";

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
  const { doCreatedInstance, doUpdatedInstance, doGetInstanceList } =
    useModel("instances");
  const { options, clusters, doGetClusters, doGetConfigMaps } =
    useModel("configure");
  const instanceFormRef = useRef<FormInstance>(null);
  const i18n = useIntl();

  const [moreOptionFlag, setMoreOptionFlag] = useState<boolean>(false);

  const onChangeMoreOptionFlag = (flag: boolean) => {
    setMoreOptionFlag(flag);
  };

  const onSubmit = (field: any) => {
    const params = {
      ...field,
      namespace: field?.k8sConfig?.[0],
      configmap: field?.k8sConfig?.[1],
    };
    delete params.k8sConfig;
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
  const { run } = useDebounceFn(onSubmit, { wait: DEBOUNCE_WAIT });

  const filter = (inputValue: string, path: any) => {
    return path.some(
      (option: any) =>
        option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
    );
  };

  useEffect(() => {
    if (visible && isEditor && current) {
      const cloneCurrent: any = cloneDeep(current);
      if (!cloneCurrent.configmap || cloneCurrent.configmap === "") {
        cloneCurrent.clusterId = undefined;
      }
      if (
        cloneCurrent.configmap &&
        cloneCurrent.namespace &&
        cloneCurrent.configmap !== "" &&
        cloneCurrent.namespace !== ""
      ) {
        cloneCurrent.k8sConfig = [
          cloneCurrent.namespace,
          cloneCurrent.configmap,
        ];
      }
      instanceFormRef.current?.setFieldsValue(cloneCurrent);
    }
  }, [visible, isEditor, current]);

  useEffect(() => {
    if (!visible) {
      onChangeMoreOptionFlag(false);
      instanceFormRef.current?.resetFields();
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
      visible={visible}
      onCancel={onCancel}
      confirmLoading={doCreatedInstance.loading || doUpdatedInstance.loading}
      okButtonProps={{
        icon: <SaveOutlined />,
      }}
      onOk={() => instanceFormRef.current?.submit()}
    >
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 18 }}
        ref={instanceFormRef}
        onFinish={run}
      >
        <Form.Item
          name={"instanceName"}
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
                  "tcp://127.0.0.1:8080?username=root&password=pass&read_timeout=10&write_timeout=20&debug=true",
              }
            )}
            autoSize={{ minRows: 5, maxRows: 5 }}
            allowClear
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
              label={i18n.formatMessage({ id: "instance.form.title.cluster" })}
              name={"clusterId"}
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
              noStyle
              shouldUpdate={(prevValues, nextValues) =>
                prevValues.clusterId !== nextValues.clusterId
              }
            >
              {({ getFieldValue, resetFields }) => {
                resetFields(["clusterConfig"]);
                const clusterId = getFieldValue("clusterId");
                if (!clusterId) return <></>;
                return (
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
                );
              }}
            </Form.Item>
            <Form.Item label={"Prometheus"} name={"prometheusTarget"}>
              <Input placeholder={"http://127.0.0.1:9090"} />
            </Form.Item>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
export default CreatedOrUpdatedInstanceModal;
