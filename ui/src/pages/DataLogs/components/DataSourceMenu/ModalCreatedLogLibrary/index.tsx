import { Form, FormInstance, message, Modal, Select } from "antd";
import { useEffect, useRef } from "react";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
import NewTable from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary/NewTable";
import LocalTable from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary/LocalTable";

const { Option } = Select;

export const logLibraryTypes = [
  { value: 1, type: "string" },
  { value: 2, type: "float" },
];

const ModalCreatedLogLibrary = () => {
  const logFormRef = useRef<FormInstance>(null);
  const i18n = useIntl();
  const {
    currentDatabase,
    addLogToDatabase,
    onChangeAddLogToDatabase,
    logLibraryCreatedModalVisible,
    onChangeLogLibraryCreatedModalVisible,
    doCreatedLogLibrary,
    doGetLogLibraryList,
    doCreatedLocalLogLibraryBatch,
    isAccessLogLibrary,
    onChangeIsAccessLogLibrary,
    onChangeIsLogLibraryAllDatabase,
  } = useModel("dataLogs");

  const instanceName = currentDatabase?.instanceName;
  const databaseName = currentDatabase?.name;

  const { doGetInstanceList, instanceList } = useModel("instances");

  const onSubmitHandle = useDebounceFn(
    (field: any) => {
      const response =
        field.mode === 1
          ? doCreatedLocalLogLibraryBatch.run(field.instance, {
              // ...field,
              mode: field.mode,
              timeField: field.timeField,
              instance: field.instance,
              tableList: field.tableList,
            })
          : doCreatedLogLibrary.run(
              (addLogToDatabase?.id as number) ||
                (currentDatabase?.id as number),
              field
            );
      response
        .then((res) => {
          if (res?.code === 0) {
            message.success(
              i18n.formatMessage({
                id: "datasource.logLibrary.created.success",
              })
            );
            doGetLogLibraryList();
          }
          onChangeLogLibraryCreatedModalVisible(false);
        })
        .catch(() => onChangeLogLibraryCreatedModalVisible(false));
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  useEffect(() => {
    !logLibraryCreatedModalVisible &&
      isAccessLogLibrary &&
      onChangeIsAccessLogLibrary(false);

    isAccessLogLibrary &&
      logFormRef.current?.setFieldsValue({
        mode: 1,
      });
  }, [isAccessLogLibrary, logLibraryCreatedModalVisible]);

  useEffect(() => {
    if (!logLibraryCreatedModalVisible && logFormRef.current) {
      onChangeIsLogLibraryAllDatabase(false);
      logFormRef.current.resetFields();
    }
  }, [logLibraryCreatedModalVisible]);

  useEffect(() => {
    if (!logLibraryCreatedModalVisible) onChangeAddLogToDatabase(undefined);
  }, [logLibraryCreatedModalVisible]);

  useEffect(() => {
    if (logLibraryCreatedModalVisible && instanceList?.length == 0)
      doGetInstanceList();
  }, [logLibraryCreatedModalVisible]);

  return (
    <Modal
      centered
      title={i18n.formatMessage({ id: "datasource.logLibrary.search.created" })}
      width={900}
      bodyStyle={{ overflowY: "scroll", maxHeight: "80vh" }}
      visible={logLibraryCreatedModalVisible}
      onCancel={() => onChangeLogLibraryCreatedModalVisible(false)}
      confirmLoading={
        doCreatedLogLibrary.loading || doCreatedLocalLogLibraryBatch.loading
      }
      onOk={() => logFormRef.current?.submit()}
    >
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
        ref={logFormRef}
        onFinish={onSubmitHandle}
      >
        <Form.Item
          label={i18n.formatMessage({
            id: "datasource.logLibrary.from.creationMode",
          })}
          name={"mode"}
          initialValue={0}
        >
          {isAccessLogLibrary ? (
            <Select disabled>
              <Option value={1}>
                {i18n.formatMessage({
                  id: "datasource.logLibrary.from.creationMode.option.logLibrary",
                })}
              </Option>
            </Select>
          ) : (
            <Select>
              <Option value={0}>
                {i18n.formatMessage({
                  id: "datasource.logLibrary.from.creationMode.option.newLogLibrary",
                })}
              </Option>
              <Option value={1}>
                {i18n.formatMessage({
                  id: "datasource.logLibrary.from.creationMode.option.logLibrary",
                })}
              </Option>
            </Select>
          )}
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, nextValues) =>
            prevValues.mode !== nextValues.mode
          }
        >
          {({ getFieldValue }) => {
            const mode = getFieldValue("mode");
            switch (mode) {
              case 0:
                return <NewTable />;
              case 1:
                return (
                  <LocalTable
                    formRef={logFormRef.current}
                    instanceName={instanceName}
                    databaseName={databaseName}
                  />
                );
              default:
                return <NewTable />;
            }
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default ModalCreatedLogLibrary;
