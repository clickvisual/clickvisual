import { NameSpaceType } from "@/services/configure";
import {
  Cascader,
  Form,
  FormInstance,
  Input,
  message,
  Modal,
  Radio,
  Select,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useIntl, useModel } from "umi";
import { RuleStoreType } from "../..";

const { Option } = Select;

interface EditEnvironmentModalProps {
  visible: boolean;
  onChangeVisible: (flag: boolean) => void;
  editEnvironmentId: number;
}

const EditEnvironmentModal = (props: EditEnvironmentModalProps) => {
  const i18n = useIntl();
  const { visible, onChangeVisible, editEnvironmentId } = props;
  const formRef = useRef<FormInstance>(null);
  const [clusterList, setClusterList] = useState<any[]>([]);

  // 当前选择的 k8s Config Map Namespace
  const [selectedNameSpace, setSelectedNameSpace] = useState<
    string | undefined
  >();

  // 当前选择的 k8s Config Map
  const [selectedConfigMap, setSelectedConfigMap] = useState<
    string | undefined
  >();

  // k8s Config Map 下拉列表
  const [configmaps, setConfigMaps] = useState<NameSpaceType[]>([]);

  const {
    doGetAlarmConfigDetails,
    doPatchAlarmConfigDetails,
    getClusterList,
    doGetConfigMaps,
  } = useModel("alarms.useAlarmEnvironment");

  useEffect(() => {
    if (visible && editEnvironmentId) {
      getClusterList.run({ pageSize: 100 }).then((res: any) => {
        if (res.code != 0) return;
        setClusterList(res.data);
      });
      doGetAlarmConfigDetails.run(editEnvironmentId).then((res: any) => {
        if (res.code != 0) return;
        formRef.current?.setFieldsValue({
          ...res.data,
          clusterId: res.data?.clusterId || undefined,
        });
        if (res.data?.clusterId && res.data.clusterId != 0) {
          doGetConfigMaps.run(res.data?.clusterId).then((res: any) => {
            if (res.code != 0) return;
            setConfigMaps(res.data);
          });
        }
      });
    } else {
      setConfigMaps([]);
      formRef.current?.resetFields();
      setSelectedNameSpace(undefined);
      setSelectedConfigMap(undefined);
    }
  }, [visible]);

  const options = useMemo(() => {
    return (
      configmaps.map((item) => {
        const children = [];
        if (item.configmaps.length > 0) {
          for (const child of item.configmaps) {
            children.push({
              value: child.configmapName,
              label: child.configmapName,
            });
          }
        }
        return {
          value: item.namespace,
          label: item.namespace,
          disabled: !(children.length > 0),
          children: children,
        };
      }) || []
    );
  }, [configmaps]);

  const filter = (inputValue: string, path: any) => {
    return path.some(
      (option: any) =>
        option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
    );
  };

  return (
    <Modal
      title={i18n.formatMessage({ id: "alarm.environment.form.title" })}
      visible={visible}
      width={800}
      onCancel={() => onChangeVisible(false)}
      onOk={() => formRef.current?.submit()}
      confirmLoading={doGetAlarmConfigDetails.loading}
    >
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 16 }}
        ref={formRef}
        onFinish={(file: any) => {
          if (!editEnvironmentId) return;
          const data = {
            ...file,
            clusterId: file.clusterId ? parseInt(file.clusterId) : 0,
            ruleStoreType: file.ruleStoreType
              ? parseInt(file.ruleStoreType)
              : 0,
            namespace: selectedNameSpace,
            configmap: selectedConfigMap,
          };
          delete data.namespaceConfigmap;
          doPatchAlarmConfigDetails
            .run(editEnvironmentId, data)
            .then((res: any) => {
              if (res.code != 0) return;
              message.success("success");
              onChangeVisible(false);
            });
        }}
      >
        <Form.Item
          label={i18n.formatMessage({
            id: "alarm.environment.form.ruleStoreType",
          })}
          name={"ruleStoreType"}
        >
          <Radio.Group
            options={[
              {
                label: i18n.formatMessage({
                  id: "alarm.environment.form.notOpen",
                }),
                value: RuleStoreType.notOpen,
              },
              {
                label: "k8s",
                value: RuleStoreType.k8s,
              },
              {
                label: i18n.formatMessage({
                  id: "alarm.environment.RuleStoreType.file",
                }),
                value: RuleStoreType.file,
              },
            ]}
          />
        </Form.Item>
        <Form.Item label={"Prometheus"} name={"prometheusTarget"}>
          <Input
            placeholder={i18n.formatMessage(
              { id: "input.placeholder" },
              {
                name: "Prometheus",
              }
            )}
          />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(pre, next) => pre.ruleStoreType != next.ruleStoreType}
        >
          {({ getFieldValue }) => {
            const ruleStoreType = getFieldValue("ruleStoreType");
            const FileType = (
              <Form.Item
                label={i18n.formatMessage({
                  id: "instance.form.title.filePath",
                })}
                name={"filePath"}
              >
                <Input
                  placeholder={i18n.formatMessage({
                    id: "instance.form.placeholder.filePath",
                  })}
                />
              </Form.Item>
            );
            const k8sType = (
              <>
                <Form.Item
                  label={i18n.formatMessage({
                    id: "instance.form.title.cluster",
                  })}
                  name={"clusterId"}
                >
                  <Select
                    placeholder={i18n.formatMessage({
                      id: "config.selectedBar.cluster",
                    })}
                    onChange={(id: number) => {
                      formRef.current?.setFieldsValue({
                        namespaceConfigmap: undefined,
                      });
                      setSelectedNameSpace(undefined);
                      setSelectedConfigMap(undefined);
                      id &&
                        doGetConfigMaps.run(id).then((res: any) => {
                          if (res.code != 0) return;
                          setConfigMaps(res.data);
                        });
                    }}
                  >
                    {clusterList.map((item: any) => {
                      return (
                        <Option value={item.id} key={item.id}>
                          {item.description?.length > 0
                            ? item.clusterName + " | " + item.description
                            : item.clusterName}
                        </Option>
                      );
                    })}
                  </Select>
                </Form.Item>
                <Form.Item
                  label={"Namespace/Configmap"}
                  name={"namespaceConfigmap"}
                  shouldUpdate={(pre, next) => pre.clusterId != next.clusterId}
                >
                  <Cascader
                    value={
                      selectedNameSpace && selectedConfigMap
                        ? [selectedNameSpace, selectedConfigMap]
                        : undefined
                    }
                    options={options}
                    disabled={
                      !Boolean(formRef.current?.getFieldValue("clusterId"))
                    }
                    expandTrigger="hover"
                    onChange={(value: any, selectedOptions: any) => {
                      if (value.length === 2) {
                        setSelectedNameSpace(value[0]);
                        setSelectedConfigMap(value[1]);
                      } else {
                        setSelectedNameSpace(undefined);
                        setSelectedConfigMap(undefined);
                      }
                    }}
                    placeholder={`${i18n.formatMessage({
                      id: "config.selectedBar.configmap",
                    })}`}
                    showSearch={{ filter }}
                  />
                </Form.Item>
              </>
            );
            const ruleStoreTypeDom = {
              [RuleStoreType.notOpen]: <></>,
              [RuleStoreType.k8s]: k8sType,
              [RuleStoreType.file]: FileType,
            };
            return ruleStoreTypeDom[ruleStoreType] || <></>;
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default EditEnvironmentModal;
