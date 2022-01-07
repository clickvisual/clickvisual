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

type ManageIndexModalProps = {};

const ManageIndexModal = (props: ManageIndexModalProps) => {
  const {
    visibleIndexModal,
    onChangeVisibleIndexModal,
    currentDatabase,
    currentLogLibrary,
    settingIndexes,
    getIndexList,
    doGetLogs,
  } = useModel("dataLogs");
  const indexFormRef = useRef<FormInstance>(null);
  const [indexList, setIndexList] = useState<IndexInfoType[]>([]);

  const cancel = () => {
    onChangeVisibleIndexModal(false);
  };

  const onSubmit = useDebounceFn(
    (field) => {
      if (!currentDatabase || !currentLogLibrary) return;
      const params = {
        instanceId: currentDatabase.instanceId,
        database: currentDatabase.databaseName,
        table: currentLogLibrary,
        data: field.data,
      };
      settingIndexes.run(params).then((res) => {
        if (res?.code === 0) {
          cancel();
          doGetLogs();
        }
      });
    },
    { wait: DEBOUNCE_WAIT }
  );

  useEffect(() => {
    if (visibleIndexModal && currentDatabase && currentLogLibrary) {
      getIndexList
        .run({
          instanceId: currentDatabase.instanceId,
          database: currentDatabase.databaseName,
          table: currentLogLibrary,
        })
        .then((res) => {
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
      title={"索引管理"}
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
          保存
        </Button>
      }
    >
      <div className={mangeIndexModalStyles.manageIndexModalMain}>
        <Form ref={indexFormRef} onFinish={onSubmit.run}>
          <Spin spinning={getIndexList.loading} tip={"加载中..."}>
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
