import {
  Form,
  FormInstance,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Spin,
} from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useModel, useIntl } from "umi";
import style from "./index.less";

const EditLogLibraryModal = (props: { onGetList: any }) => {
  const { onGetList } = props;
  const { Option } = Select;
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
            kafkaSkipBrokenMessages: res.data.KafkaSkipBrokenMessages,
            kafkaTopic: res.data.topic,
            mergeTreeTTL: res.data.days,
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
      visible={isModifyLog}
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
          <Form.Item
            label={i18n.formatMessage({
              id: "log.editLogLibraryModal.label.tabName",
            })}
            name={"name"}
          >
            <Input disabled />
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
            <Select
              disabled={!isCVCreate}
              placeholder={i18n.formatMessage(
                { id: "select.placeholder" },
                { name: "SkipBrokenMessages" }
              )}
            >
              <Option value={1}>
                {i18n.formatMessage({
                  id: "alarm.rules.history.isPushed.true",
                })}
              </Option>
              <Option value={0}>
                {i18n.formatMessage({
                  id: "alarm.rules.history.isPushed.false",
                })}
              </Option>
            </Select>
          </Form.Item>
          <Form.Item
            label={i18n.formatMessage({
              id: "DescAsAlias",
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
