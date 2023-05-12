import { Form, FormInstance, Input, message, Modal, Select } from "antd";
import { useEffect, useRef, useState } from "react";
import { useIntl, useModel } from "umi";

const { Option } = Select;

const EditDatabaseModel = (props: {
  onGetList: () => void;
  allInstancesData: any[];
}) => {
  const { onGetList, allInstancesData } = props;
  const i18n = useIntl();
  const { isEditDatabase, onChangeIsEditDatabase, currentEditDatabase } =
    useModel("dataLogs");
  const { doUpdatedDatabase } = useModel("database");
  const { instanceList, getInstanceList } = useModel("instances");
  const editDatabaseFormRef = useRef<FormInstance>(null);
  const [clustersList, steClustersList] = useState<any>([]);
  const [iName, setIName] = useState<string>("");

  useEffect(() => {
    if (isEditDatabase) {
      editDatabaseFormRef.current?.setFieldsValue({
        name: currentEditDatabase?.databaseName,
        ...currentEditDatabase,
      });
      if (instanceList?.length == 0) {
        getInstanceList.run();
      }
      setIName(
        allInstancesData.filter(
          (item: any) => item.id == currentEditDatabase.iid
        )[0].instanceName || ""
      );
    } else {
      editDatabaseFormRef.current?.resetFields();
      setIName("");
    }
  }, [isEditDatabase]);

  useEffect(() => {
    if (currentEditDatabase?.iid) {
      fillCluster(currentEditDatabase?.iid);
    }
  }, [isEditDatabase, instanceList]);

  const handleSubmit = (val: any) => {
    if (!currentEditDatabase?.id) return;
    doUpdatedDatabase.run(currentEditDatabase.id, val).then((res: any) => {
      if (res.code != 0) {
        message.error(res.msg);
        return;
      }
      message.success(
        i18n.formatMessage({ id: "log.editLogLibraryModal.modifySuc" })
      );
      onChangeIsEditDatabase(false);
      onGetList();
    });
  };

  const fillCluster = (iid: number) => {
    const dataList = instanceList.filter((item) => item.id == iid);
    if (dataList[0]?.mode == 1) {
      steClustersList(dataList[0].clusters);
      editDatabaseFormRef.current?.setFieldsValue({
        cluster: currentEditDatabase?.cluster,
      });
    } else {
      steClustersList([]);
    }
  };

  return (
    <Modal
      title={i18n.formatMessage({ id: "log.editDatabaseModel.title" })}
      open={isEditDatabase}
      onCancel={() => onChangeIsEditDatabase(false)}
      onOk={() => editDatabaseFormRef.current?.submit()}
      width={"45%"}
    >
      <Form
        ref={editDatabaseFormRef}
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 14 }}
        onFinish={handleSubmit}
      >
        <Form.Item name={"id"} hidden>
          <Input />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "datasource.logLibrary.from.newLogLibrary.instance",
          })}
        >
          <Input value={iName} disabled />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "instance.form.title.cluster" })}
          name={"cluster"}
          hidden={!clustersList.length}
          rules={
            !clustersList.length
              ? []
              : [
                  {
                    required: true,
                    message: i18n.formatMessage({
                      id: "config.selectedBar.cluster",
                    }),
                  },
                ]
          }
        >
          <Select
            style={{ width: "100%" }}
            disabled={!!currentEditDatabase?.cluster}
            placeholder={`${i18n.formatMessage({
              id: "config.selectedBar.cluster",
            })}`}
          >
            {clustersList.map((item: string, index: number) => (
              <Option key={index} value={item}>
                {item}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "database.form.label.name" })}
          name={"name"}
        >
          <Input disabled />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "descAsAlias",
          })}
          name={"desc"}
        >
          <Input
            placeholder={i18n.formatMessage({
              id: "log.editLogLibraryModal.label.desc.placeholder",
            })}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default EditDatabaseModel;
