import { Form, Modal, Input } from "antd";
import { useCallback, useEffect, useRef } from "react";
import { FormInstance } from "antd/es/form";
import { useModel } from "@@/plugin-model/useModel";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
import { useIntl } from "umi";

const CreatedAndEditorWorkflow = () => {
  const i18n = useIntl();
  const formRef = useRef<FormInstance>(null);
  const { workflow, currentInstances } = useModel("dataAnalysis");
  const {
    visibleWorkflowEditModal,
    isEditWorkflow,
    setIsEditWorkflow,
    setWorkflowList,
    setVisibleWorkflowEditModal,
    getWorkflows,
    addWorkflow,
    updateWorkflow,
    editWorkflow,
  } = workflow;

  const handleCancel = useCallback(() => {
    setVisibleWorkflowEditModal(false);
    setIsEditWorkflow(false);
  }, []);

  const handleSubmitForm = (fields: any) => {
    if (!currentInstances) return;
    !isEditWorkflow ? doAddWorkflow(fields) : doUpdateWorkflow(fields);
  };

  const doAddWorkflow = (fields: any) => {
    addWorkflow.run({ ...fields, iid: currentInstances! }).then((res) => {
      if (res?.code !== 0) return;
      getWorkflows.run({ iid: currentInstances! }).then((res) => {
        if (res?.code !== 0) return;
        setWorkflowList(res.data);
      });
      handleCancel();
    });
  };

  const doUpdateWorkflow = (fields: any) => {
    updateWorkflow
      .run(editWorkflow!.id, { ...fields, iid: currentInstances! })
      .then((res) => {
        if (res?.code !== 0) return;
        getWorkflows.run({ iid: currentInstances! }).then((res) => {
          if (res?.code !== 0) return;
          setWorkflowList(res.data);
        });
        handleCancel();
      });
  };

  const onOk = useDebounceFn(
    () => {
      if (!formRef.current) return;
      formRef.current.submit();
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  useEffect(() => {
    if (!visibleWorkflowEditModal && formRef.current) {
      formRef.current.resetFields();
    }
  }, [visibleWorkflowEditModal]);

  useEffect(() => {
    if (
      isEditWorkflow &&
      visibleWorkflowEditModal &&
      editWorkflow &&
      formRef.current
    ) {
      formRef.current.setFieldsValue({
        name: editWorkflow.name,
        desc: editWorkflow.desc,
      });
    }
  }, [editWorkflow, visibleWorkflowEditModal, isEditWorkflow]);

  return (
    <Modal
      title={i18n.formatMessage({
        id: `bigdata.workflow.rightMenu.${!isEditWorkflow ? "add" : "update"}`,
      })}
      width={700}
      visible={visibleWorkflowEditModal}
      onCancel={handleCancel}
      onOk={onOk}
      confirmLoading={addWorkflow.loading || updateWorkflow.loading}
    >
      <Form
        ref={formRef}
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 17 }}
        onFinish={handleSubmitForm}
      >
        <Form.Item
          name={"name"}
          label={i18n.formatMessage({ id: "bigdata.workflow.form.name" })}
          rules={[{ required: true }]}
        >
          <Input
            allowClear
            placeholder={i18n.formatMessage({
              id: "bigdata.workflow.form.name.placeholder",
            })}
          />
        </Form.Item>
        <Form.Item
          name={"desc"}
          label={i18n.formatMessage({ id: "description" })}
        >
          <Input.TextArea
            allowClear
            autoSize={{ minRows: 4, maxRows: 4 }}
            placeholder={i18n.formatMessage({
              id: "datasource.logLibrary.from.newLogLibrary.desc.placeholder",
            })}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreatedAndEditorWorkflow;
