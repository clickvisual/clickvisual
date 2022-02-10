import mangeIndexModalStyles from "@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal/index.less";
import CustomModal from "@/components/CustomModal";
import { useModel } from "@@/plugin-model/useModel";
import { Button, Form, FormInstance, Spin } from "antd";
import { useEffect, useRef, useState } from "react";
import { SaveOutlined } from "@ant-design/icons";
import TableHeader from "@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal/TableHeader";
import TableBody from "@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal/TableBody";
import TableFooter from "@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal/TableFooter";
import { useDebounceFn } from "ahooks";
import { IndexInfoType } from "@/services/dataLogs";
import { DEBOUNCE_WAIT } from "@/config/config";
import { useIntl } from "umi";

const ManageIndexModal = () => {
  const {
    visibleIndexModal,
    onChangeVisibleIndexModal,
    currentLogLibrary,
    settingIndexes,
    getIndexList,
    doGetLogs,
    doParseQuery,
  } = useModel("dataLogs");
  const indexFormRef = useRef<FormInstance>(null);
  const [indexList, setIndexList] = useState<IndexInfoType[]>([]);

  const i18n = useIntl();

  const cancel = () => {
    onChangeVisibleIndexModal(false);
  };

  const onSubmit = useDebounceFn(
    (field) => {
      if (!currentLogLibrary) return;

      settingIndexes
        .run(currentLogLibrary.id, { data: field.data })
        .then((res) => {
          if (res?.code === 0) {
            cancel();
            doGetLogs();
            doParseQuery();
          }
        });
    },
    { wait: DEBOUNCE_WAIT }
  );

  useEffect(() => {
    if (visibleIndexModal && currentLogLibrary) {
      getIndexList.run(currentLogLibrary.id).then((res) => {
        if (res?.code === 0) {
          setIndexList(res.data);
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
      title={i18n.formatMessage({ id: "log.index.manage" })}
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
        <Form ref={indexFormRef} onFinish={onSubmit.run}>
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
