import mangeIndexModalStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal/index.less";
import CustomModal from "@/components/CustomModal";
import { useModel } from "@@/plugin-model/useModel";
import { Button, Form, FormInstance, Spin } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { SaveOutlined } from "@ant-design/icons";
import TableHeader from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal/TableHeader";
import TableBody from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal/TableBody";
import TableFooter from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal/TableFooter";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";
import { useIntl } from "umi";
import { FieldType } from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/ManageIndexModal/TableBody/IndexItem";
import { IndexInfoType } from "@/services/dataLogs";
import { PaneType } from "@/models/datalogs/types";

const ManageIndexModal = () => {
  const {
    visibleIndexModal,
    onChangeVisibleIndexModal,
    currentLogLibrary,
    settingIndexes,
    getIndexList,
    doGetLogsAndHighCharts,
    logPanesHelper,
    onChangeCurrentLogPane,
  } = useModel("dataLogs");
  const { logPanes } = logPanesHelper;
  const indexFormRef = useRef<FormInstance>(null);
  const [indexList, setIndexList] = useState<any[]>([]);

  const i18n = useIntl();

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const cancel = () => {
    onChangeVisibleIndexModal(false);
  };

  const handleSubmit = useDebounceFn(
    (field) => {
      if (!currentLogLibrary) return;
      const params =
        field?.data?.reduce((prev: IndexInfoType[], current: IndexInfoType) => {
          if (current.typ === FieldType.Json) prev.push(...current.jsonIndex);
          else prev.push({ ...current, jsonIndex: [] });
          return prev;
        }, []) || [];
      settingIndexes.run(currentLogLibrary.id, { data: params }).then((res) => {
        if (res?.code === 0) {
          cancel();
          doGetLogsAndHighCharts(currentLogLibrary.id).then((res) => {
            if (!res) return;
            onChangeCurrentLogPane({
              ...(oldPane as PaneType),
              logs: res.logs,
              highCharts: res.highCharts,
            });
          });
        }
      });
    },
    { wait: DEBOUNCE_WAIT }
  );

  const setIndexes = (response: IndexInfoType[]) => {
    const formData = response.reduce(
      (prev: IndexInfoType[], current: IndexInfoType) => {
        if (current.rootName == "") {
          return [...prev, current];
        }

        let rootIdx = prev.findIndex((item) => item.field === current.rootName);
        if (rootIdx > -1) {
          prev[rootIdx].jsonIndex.push(current);
        } else {
          prev.push({
            field: current.rootName,
            typ: FieldType.Json,
            jsonIndex: [current],
            alias: "",
            rootName: "",
          });
        }

        return prev;
      },
      []
    );

    setIndexList(formData);
  };

  useEffect(() => {
    if (visibleIndexModal && currentLogLibrary) {
      getIndexList.run(currentLogLibrary.id).then((res) => {
        if (res?.code === 0) {
          setIndexes(res.data);
        }
      });
    } else {
      indexFormRef.current?.resetFields();
    }
  }, [visibleIndexModal]);

  useEffect(() => {
    if (indexList.length > 0) {
      indexFormRef.current?.setFieldsValue({ data: indexList });
    }
  }, [indexList]);
  return (
    <CustomModal
      onCancel={cancel}
      title={i18n.formatMessage({ id: "log.index.manage.desc" })}
      visible={visibleIndexModal}
      width={"70vw"}
      footer={
        <Button
          loading={settingIndexes.loading}
          size={"small"}
          type={"primary"}
          icon={<SaveOutlined />}
          onClick={() => {
            indexFormRef.current?.submit();
          }}
        >
          {i18n.formatMessage({ id: "button.save" })}
        </Button>
      }
    >
      <div className={mangeIndexModalStyles.manageIndexModalMain}>
        <Form ref={indexFormRef} onFinish={handleSubmit.run}>
          <Spin
            spinning={getIndexList.loading}
            tip={i18n.formatMessage({ id: "spin" })}
          >
            <table className={mangeIndexModalStyles.tableMain}>
              <TableHeader />
              <Form.List name={"data"}>
                {(fields, fieldsOptions) => (
                  <>
                    <TableBody
                      fields={fields}
                      options={fieldsOptions}
                      form={indexFormRef.current as FormInstance}
                    />
                    <TableFooter options={fieldsOptions} />
                  </>
                )}
              </Form.List>
            </table>
          </Spin>
        </Form>
      </div>
    </CustomModal>
  );
};
export default ManageIndexModal;
