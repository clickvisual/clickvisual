import CustomModal from "@/components/CustomModal";
import { DEBOUNCE_WAIT } from "@/config/config";
import clusterPanelStyles from "@/pages/SystemSetting/ClustersPanel/index.less";
import type { ClusterType } from "@/services/systemSetting";
import { SaveOutlined } from "@ant-design/icons";
import { useModel } from "@umijs/max";
import { useDebounceFn } from "ahooks";
import type { FormInstance } from "antd";
import { Button, Form, Input, Select } from "antd";
import { useEffect, useRef } from "react";
import { useIntl } from "umi";

const { Option } = Select;

type CreatedOrUpdatedClusterModalProps = {
  isEditor?: boolean;
  current?: ClusterType;
  open: boolean;
  onCancel: () => void;
};

const CreatedOrUpdatedClusterModal = (
  props: CreatedOrUpdatedClusterModalProps
) => {
  const { open, onCancel, isEditor, current } = props;
  const { doCreatedCluster, doGetClustersList, doUpdatedCluster } =
    useModel("clusters");
  const clusterFormRef = useRef<FormInstance>(null);
  const i18n = useIntl();

  const ClusterStatus = [
    {
      value: 0,
      name: i18n.formatMessage({ id: "cluster.form.status.normality" }),
    },
    {
      value: 1,
      name: i18n.formatMessage({ id: "cluster.form.status.normality" }),
    },
  ];

  const onSubmit = useDebounceFn(
    (field) => {
      if (isEditor && current?.id) {
        doUpdatedCluster.run(current.id, field).then(() => doGetClustersList());
      } else {
        doCreatedCluster.run(field).then(() => doGetClustersList());
      }
      onCancel();
    },
    { wait: DEBOUNCE_WAIT }
  );

  const loading = doCreatedCluster.loading || doUpdatedCluster.loading;

  useEffect(() => {
    if (open && isEditor && current) {
      clusterFormRef.current?.setFieldsValue(current);
    } else {
      clusterFormRef.current?.resetFields();
    }
  }, [open, isEditor, current]);
  return (
    <CustomModal
      title={i18n.formatMessage({
        id: `cluster.form.title.${isEditor ? "edit" : "created"}`,
      })}
      open={open}
      onCancel={onCancel}
      width={"70vw"}
    >
      <Form
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 18 }}
        ref={clusterFormRef}
        onFinish={onSubmit.run}
      >
        <Form.Item
          label={i18n.formatMessage({ id: "cluster.clusterName" })}
          name={"clusterName"}
        >
          <Input
            placeholder={`${i18n.formatMessage({
              id: "cluster.form.placeholder.clusterName",
            })}`}
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "cluster.form.status" })}
          name={"status"}
          initialValue={0}
        >
          <Select disabled>
            {ClusterStatus.map((status) => (
              <Option key={status.value} value={status.value}>
                {status.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label={"k8sApiServerAddr"} name={"apiServer"}>
          <Input
            placeholder={`${i18n.formatMessage({
              id: "cluster.form.placeholder.apiServer",
            })}`}
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "cluster.k8sConfiguration" })}
          name={"kubeConfig"}
        >
          <Input.TextArea
            placeholder={`${i18n.formatMessage({
              id: "cluster.form.placeholder.k8sConfiguration",
            })}`}
            autoSize={{ minRows: 5, maxRows: 5 }}
            allowClear
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "description" })}
          name={"description"}
        >
          <Input.TextArea
            placeholder={`${i18n.formatMessage({
              id: "cluster.form.placeholder.description",
            })}`}
            autoSize={{ minRows: 5, maxRows: 5 }}
            allowClear
          />
        </Form.Item>
        <Form.Item noStyle>
          <div className={clusterPanelStyles.formBtn}>
            <Button
              loading={loading}
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
export default CreatedOrUpdatedClusterModal;
