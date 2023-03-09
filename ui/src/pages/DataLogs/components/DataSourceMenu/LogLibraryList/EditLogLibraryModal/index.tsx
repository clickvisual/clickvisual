import {
  Form,
  FormInstance,
  Input,
  InputNumber,
  message,
  Modal,
  Spin,
  Switch,
} from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useIntl, useModel } from "umi";
import style from "./index.less";

const EditLogLibraryModal = (props: { onGetList: any }) => {
  const { onGetList } = props;
  const i18n = useIntl();
  const {
    isModifyLog,
    onChangeIsModifyLog,
    currentEditLogLibrary,
    doGetLogLibrary,
    doUpdateLogLibrary,
    updateLogLibraryLoading,
    getLogLibraryLoading,
  } = useModel("dataLogs");
  const editDatabaseFormRef = useRef<FormInstance>(null);

  useEffect(() => {
    if (isModifyLog && currentEditLogLibrary?.id) {
      doGetLogLibrary
        .run(currentEditLogLibrary.id)
        .then((res: any) => {
          if (res.code != 0) {
            message.error(res.msg);
            return;
          }
          editDatabaseFormRef.current?.setFieldsValue({
            name: res.data.name,
            desc: res.data.desc,
            kafkaBrokers: res.data.brokers,
            kafkaConsumerNum: res.data.consumerNum || undefined,
            kafkaSkipBrokenMessages: res.data.kafkaSkipBrokenMessages,
            kafkaTopic: res.data.topic,
            mergeTreeTTL: res.data.days,
            v3TableType: Boolean(res.data?.v3TableType),
          });
        })
        .catch((res) => {
          res?.msg && message.error(res.msg);
        });
    } else {
      editDatabaseFormRef.current?.resetFields();
    }
  }, [isModifyLog]);

  const isCVCreate = useMemo(() => {
    return currentEditLogLibrary?.createType !== 1;
  }, [currentEditLogLibrary]);

  const handleSubmit = (val: any) => {
    if (!currentEditLogLibrary?.id) return;
    val.v3TableType = val.v3TableType ? 1 : 0;
    doUpdateLogLibrary
      .run(currentEditLogLibrary?.id, val)
      .then((res: any) => {
        if (res.code != 0) {
          message.error(res.msg);
          return;
        }
        message.success(
          i18n.formatMessage({ id: "log.editLogLibraryModal.modifySuc" })
        );
        onChangeIsModifyLog(false);
        onGetList();
      })
      .catch((res) => {
        res?.msg && message.error(res.msg);
      });
  };

  return (
    <Modal
      title={i18n.formatMessage({ id: "datasource.tooltip.icon.edit" })}
      open={isModifyLog}
      onCancel={() => onChangeIsModifyLog(false)}
      onOk={() => editDatabaseFormRef.current?.submit()}
      width={"60%"}
      confirmLoading={updateLogLibraryLoading || getLogLibraryLoading}
    >
      <Form
        ref={editDatabaseFormRef}
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 14 }}
        onFinish={handleSubmit}
        className={style.form}
      >
        <Spin spinning={getLogLibraryLoading || updateLogLibraryLoading}>
          <Form.Item hidden name={"createType"}>
            <Input />
          </Form.Item>
          <Form.Item
            label={i18n.formatMessage({
              id: "log.editLogLibraryModal.label.tabName",
            })}
            name={"name"}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            valuePropName="checked"
            name={"v3TableType"}
            label={i18n.formatMessage({
              id: "datasource.logLibrary.isLinkLogLibrary",
            })}
          >
            <Switch />
          </Form.Item>
          <Form.Item label="Topics" name={"kafkaTopic"}>
            <Input
              disabled={!isCVCreate}
              placeholder={i18n.formatMessage(
                { id: "input.placeholder" },
                { name: "Topics" }
              )}
            />
          </Form.Item>
          <Form.Item label="Brokers" name={"kafkaBrokers"}>
            <Input
              disabled={!isCVCreate}
              placeholder={i18n.formatMessage(
                { id: "input.placeholder" },
                { name: "Brokers" }
              )}
            />
          </Form.Item>
          <Form.Item
            label={i18n.formatMessage({
              id: "datasource.logLibrary.from.days",
            })}
            name={"mergeTreeTTL"}
          >
            <InputNumber
              disabled={!isCVCreate}
              placeholder={i18n.formatMessage(
                { id: "input.placeholder" },
                {
                  name: i18n.formatMessage({
                    id: "datasource.logLibrary.from.days",
                  }),
                }
              )}
            />
          </Form.Item>
          <Form.Item label="ConsumerNum" name={"kafkaConsumerNum"}>
            <InputNumber
              max={8}
              min={1}
              placeholder={i18n.formatMessage(
                { id: "input.placeholder" },
                { name: "ConsumerNum(1~8)" }
              )}
              disabled={!isCVCreate}
            />
          </Form.Item>
          <Form.Item
            label="SkipBrokenMessages"
            name={"kafkaSkipBrokenMessages"}
          >
            <InputNumber
              disabled={!isCVCreate}
              placeholder={i18n.formatMessage(
                { id: "input.placeholder" },
                { name: "SkipBrokenMessages" }
              )}
            />
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
        </Spin>
      </Form>
    </Modal>
  );
};
export default EditLogLibraryModal;
