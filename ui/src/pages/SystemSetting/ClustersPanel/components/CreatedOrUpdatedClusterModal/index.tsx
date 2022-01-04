import clusterPanelStyles from "@/pages/SystemSetting/ClustersPanel/index.less";
import CustomModal from "@/components/CustomModal";
import type { FormInstance } from "antd";
import { Button, Form, Input, Select } from "antd";
import { useEffect, useRef } from "react";
import { useDebounceFn } from "ahooks";
import { useModel } from "@@/plugin-model/useModel";
import type { ClusterType } from "@/services/systemSetting";

const { Option } = Select;

const ClusterStatus = [
  { value: 0, name: "正常" },
  { value: 1, name: "不正常" },
];

type CreatedOrUpdatedClusterModalProps = {
  isEditor?: boolean;
  current?: ClusterType;
  visible: boolean;
  onCancel: () => void;
};

const CreatedOrUpdatedClusterModal = (
  props: CreatedOrUpdatedClusterModalProps
) => {
  const { visible, onCancel, isEditor, current } = props;
  const { doCreatedCluster, doGetClustersList, doUpdatedCluster } =
    useModel("clusters");
  const clusterFormRef = useRef<FormInstance>(null);

  const onSubmit = useDebounceFn(
    (field) => {
      if (isEditor && current?.id) {
        doUpdatedCluster.run(current.id, field).then(() => doGetClustersList());
      } else {
        doCreatedCluster.run(field).then(() => doGetClustersList());
      }
      onCancel();
    },
    { wait: 500 }
  );

  useEffect(() => {
    if (visible && isEditor && current) {
      clusterFormRef.current?.setFieldsValue(current);
    } else {
      clusterFormRef.current?.resetFields();
    }
  }, [visible, isEditor, current]);
  return (
    <CustomModal
      title={`${isEditor ? "编辑" : "新增"}集群`}
      visible={visible}
      onCancel={onCancel}
      width={"70vw"}
    >
      <Form ref={clusterFormRef} onFinish={onSubmit.run}>
        <Form.Item label={"名称"} name={"clusterName"}>
          <Input placeholder="请输入集群名称" />
        </Form.Item>
        <Form.Item label={"状态"} name={"status"} initialValue={0}>
          <Select disabled>
            {ClusterStatus.map((status) => (
              <Option key={status.value} value={status.value}>
                {status.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label={"描述"} name={"description"}>
          <Input.TextArea
            placeholder="请输入集群描述"
            autoSize={{ minRows: 5, maxRows: 5 }}
            allowClear
          />
        </Form.Item>
        <Form.Item label={"k8s配置"} name={"kubeConfig"}>
          <Input.TextArea
            placeholder="请输入集群 k8s 配置"
            autoSize={{ minRows: 5, maxRows: 5 }}
            allowClear
          />
        </Form.Item>
        <Form.Item label={"Api Server"} name={"apiServer"}>
          <Input placeholder="请输入 Api Server" />
        </Form.Item>
        <Form.Item noStyle>
          <div className={clusterPanelStyles.formBtn}>
            <Button type={"primary"} htmlType={"submit"}>
              提交
            </Button>
          </div>
        </Form.Item>
      </Form>
    </CustomModal>
  );
};
export default CreatedOrUpdatedClusterModal;
