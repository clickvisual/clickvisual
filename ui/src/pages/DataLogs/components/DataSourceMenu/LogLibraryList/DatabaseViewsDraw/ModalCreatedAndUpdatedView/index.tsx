import CustomModal from "@/components/CustomModal";
import { Button, Form, FormInstance, Input, Select, Switch } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useIntl } from "umi";
import { useEffect, useRef } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { useDebounceFn } from "ahooks";
import { cloneDeep } from "lodash";
import { CreatedViewRequest, TablesResponse } from "@/services/dataLogs";
import { DEBOUNCE_WAIT } from "@/config/config";

const { Option } = Select;
type ModalCreatedAndUpdatedViewProps = {
  getList: () => void;
  logLibrary: TablesResponse;
};
const ModalCreatedAndUpdatedView = ({
  getList,
  logLibrary,
}: ModalCreatedAndUpdatedViewProps) => {
  const {
    viewVisibleModal,
    onChangeViewVisibleModal,
    onChangeViewIsEdit,
    viewIsEdit,
    editView,
    createdView,
    updatedView,
  } = useModel("dataLogs");
  const viewFormRef = useRef<FormInstance>(null);
  const i18n = useIntl();

  const doCreated = useDebounceFn(
    (values: CreatedViewRequest) => {
      createdView.run(logLibrary.id, values).then((res) => {
        if (res?.code === 0) {
          getList();
          onChangeViewVisibleModal(false);
        }
      });
    },
    { wait: DEBOUNCE_WAIT }
  );

  const doUpdated = useDebounceFn(
    (values: CreatedViewRequest) => {
      if (!viewIsEdit || !editView) return;
      updatedView.run(editView.id as number, values).then((res) => {
        if (res?.code === 0) {
          getList();
          onChangeViewVisibleModal(false);
        }
      });
    },
    { wait: DEBOUNCE_WAIT }
  );

  const handleSubmit = (field: CreatedViewRequest) => {
    const params = cloneDeep(field);
    params.isUseDefaultTime = Number(field.isUseDefaultTime);
    switch (viewIsEdit) {
      case true:
        doUpdated.run(params);
        return;
      case false:
        doCreated.run(params);
        return;
    }
  };

  const timeKeyFormats = [
    {
      value: "fromUnixTimestamp64Micro",
      name: i18n.formatMessage({
        id: "datasource.logLibrary.views.selectName.timeFormat.unix",
      }),
    },
  ];

  useEffect(() => {
    if (!viewVisibleModal && viewFormRef.current) {
      viewFormRef.current.resetFields();
      onChangeViewIsEdit(false);
    }
  }, [viewVisibleModal]);

  useEffect(() => {
    if (viewVisibleModal && viewIsEdit && editView && viewFormRef.current) {
      viewFormRef.current.setFieldsValue(editView);
    }
  }, [viewVisibleModal, viewIsEdit, editView]);

  return (
    <CustomModal
      title={i18n.formatMessage({
        id: `datasource.logLibrary.views.modal.${
          viewIsEdit ? "edit" : "created"
        }`,
      })}
      width={800}
      visible={viewVisibleModal}
      onCancel={() => onChangeViewVisibleModal(false)}
      footer={
        <Button
          type="primary"
          loading={createdView.loading || updatedView.loading}
          onClick={() => viewFormRef.current?.submit()}
          icon={<SaveOutlined />}
        >
          {i18n.formatMessage({ id: "submit" })}
        </Button>
      }
    >
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
        ref={viewFormRef}
        onFinish={handleSubmit}
      >
        <Form.Item
          label={i18n.formatMessage({
            id: "datasource.logLibrary.views.form.viewName",
          })}
          name={"viewName"}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "datasource.logLibrary.views.placeholder.viewName",
              }),
            },
          ]}
        >
          <Input
            disabled={viewIsEdit}
            placeholder={`${i18n.formatMessage({
              id: "datasource.logLibrary.views.placeholder.viewName",
            })}`}
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "datasource.logLibrary.views.form.isUseDefaultTime",
          })}
          name={"isUseDefaultTime"}
          valuePropName="checked"
          initialValue={false}
          hidden
        >
          <Switch />
        </Form.Item>
        {/*<Form.Item*/}
        {/*  noStyle*/}
        {/*  shouldUpdate={(prev, next) =>*/}
        {/*    prev.isUseDefaultTime !== next.isUseDefaultTime*/}
        {/*  }*/}
        {/*>*/}
        {/*  {({ getFieldValue }) => {*/}
        {/*    if (!getFieldValue("isUseDefaultTime")) {*/}
        {/*      return (*/}
        {/*        <>*/}
        <Form.Item
          label={i18n.formatMessage({
            id: "datasource.logLibrary.views.form.timeKey",
          })}
          name={"key"}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "datasource.logLibrary.views.placeholder.timeKey",
              }),
            },
          ]}
        >
          <Input
            placeholder={`${i18n.formatMessage({
              id: "datasource.logLibrary.views.placeholder.timeKey",
            })}`}
          />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "datasource.logLibrary.views.form.timeFormat",
          })}
          name={"format"}
          rules={[
            {
              required: true,
              message: i18n.formatMessage({
                id: "datasource.logLibrary.views.placeholder.timeFormat",
              }),
            },
          ]}
        >
          <Select
            placeholder={`${i18n.formatMessage({
              id: "datasource.logLibrary.views.placeholder.timeFormat",
            })}`}
            style={{ width: "100%" }}
          >
            {timeKeyFormats.map((format) => (
              <Option key={format.value} value={format.value}>
                {format.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        {/*</>*/}
        {/*       );*/}
        {/*  }*/}
        {/*      return;*/}
        {/*    }}*/}
        {/*</Form.Item>*/}
      </Form>
    </CustomModal>
  );
};
export default ModalCreatedAndUpdatedView;
