import { Form, FormInstance, message, Modal, Select } from "antd";
import { useEffect, useRef, useState } from "react";
import { useIntl } from "umi";
import { useModel } from "@@/plugin-model/useModel";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
import NewTable from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary/NewTable";
import LocalTable from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary/LocalTable";
import SelectField from "./SelectField";

const { Option } = Select;

export const logLibraryTypes = [
  { value: 1, type: "string" },
  { value: 2, type: "float" },
];

const ModalCreatedLogLibrary = (props: { onGetList: any }) => {
  const { onGetList } = props;
  const logFormRef = useRef<FormInstance>(null);
  const i18n = useIntl();
  const {
    addLogToDatabase,
    onChangeAddLogToDatabase,
    logLibraryCreatedModalVisible,
    onChangeLogLibraryCreatedModalVisible,
    doCreatedLogLibraryAsString,
    doCreatedLogLibraryEachRow,
    doCreatedLocalLogLibraryBatch,
    isAccessLogLibrary,
    onChangeIsAccessLogLibrary,
    onChangeIsLogLibraryAllDatabase,
    doGetMappingJson,
  } = useModel("dataLogs");
  const [visibleSelectField, setVisibleSelectField] = useState<boolean>(false);
  const [mappingJson, setMappingJson] = useState<any>({});

  const { doGetInstanceList, instanceList } = useModel("instances");

  const onSubmitHandle = useDebounceFn(
    (field: any) => {
      // delete field.source;
      const response =
        field.mode === 1
          ? doCreatedLocalLogLibraryBatch.run(field.instance, {
              mode: field.mode,
              timeField: field.timeField,
              instance: field.instance,
              tableList: field.tableList,
            })
          : field.mode === 2
          ? doCreatedLogLibraryAsString.run({
              databaseId: addLogToDatabase?.id as number,
              ...field,
            })
          : doCreatedLogLibraryEachRow.run({
              databaseId: addLogToDatabase?.id as number,
              ...field,
            });
      response
        .then((res) => {
          if (res?.code === 0) {
            message.success(
              i18n.formatMessage({
                id: "datasource.logLibrary.created.success",
              })
            );
            onGetList();
            onChangeLogLibraryCreatedModalVisible(false);
          }
        })
        .catch(() => onChangeLogLibraryCreatedModalVisible(false));
    },
    { wait: DEBOUNCE_WAIT }
  ).run;

  const handleConversionMappingJson = (str: string) => {
    doGetMappingJson.run({ data: str }).then((res: any) => {
      if (res.code != 0) return;
      setMappingJson(res.data.data);
      setVisibleSelectField(true);
    });
  };

  const handleConfirm = (data: { rawLogField: string; timeField: string }) => {
    mappingJson.map((item: { key: string; value: string }) => {
      if (item.key == data.timeField) {
        logFormRef.current?.setFieldsValue({
          typ: item.value == "String" ? 1 : 2,
        });
      }
    });
    logFormRef.current?.setFieldsValue({
      rawLogField: data.rawLogField,
      timeField: data.timeField,
    });
  };

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
        doCreatedLogLibraryAsString.loading ||
        doCreatedLocalLogLibraryBatch.loading
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
            <Select
              onChange={(value) => {
                logFormRef.current?.resetFields();
                logFormRef.current?.setFieldsValue({ mode: value });
              }}
            >
              <Option value={0}>
                {i18n.formatMessage({
                  id: "datasource.logLibrary.from.creationMode.option.newLogLibrary",
                })}
                - JSONEachRow
              </Option>
              <Option value={2}>
                {i18n.formatMessage({
                  id: "datasource.logLibrary.from.creationMode.option.newLogLibrary",
                })}
                - JSONAsString
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
              case 1:
                return <LocalTable formRef={logFormRef.current} />;
              default:
                return (
                  <NewTable
                    formRef={logFormRef}
                    onConversionMappingJson={handleConversionMappingJson}
                    mode={mode}
                  />
                );
            }
          }}
        </Form.Item>
      </Form>
      {visibleSelectField && (
        <SelectField
          mappingJson={mappingJson}
          visible={visibleSelectField}
          onCancel={() => setVisibleSelectField(false)}
          onConfirm={handleConfirm}
        />
      )}
    </Modal>
  );
};
export default ModalCreatedLogLibrary;
