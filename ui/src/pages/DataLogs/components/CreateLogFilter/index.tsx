import styles from "./index.less";
import {
  Form,
  FormInstance,
  Input,
  message,
  Modal,
  Select,
  Switch,
} from "antd";
import { useEffect, useRef } from "react";
import { useIntl, useModel } from "umi";
import classNames from "classnames";
import { CollectType } from "@/services/dataLogs";
import { cloneDeep } from "lodash";

const operatorList = ["=", "!=", "<", "<=", ">", ">="];
const { Option } = Select;

const CreateLogFilter = ({ tid }: { tid: number }) => {
  const i18n = useIntl();
  const {
    visibleLogFilter,
    onChangeVisibleLogFilter,
    doCreateLogFilter,
    editLogFilterInfo,
    onChangeEditLogFilterInfo,
    doEditLogFilter,
    doGetLogsAndHighCharts,
    columsList,
    logPanesHelper,
    onChangeCurrentLogPane,
  } = useModel("dataLogs");
  const formFilterRef = useRef<FormInstance>(null);

  const handleFinish = (file: {
    alias: string;
    field: string;
    isCustom: boolean;
    operator: string;
    value: string;
  }) => {
    const data: any = {
      alias: file?.isCustom ? file?.alias : undefined,
      collectType: CollectType.tableFilter,
      statement: `${file.field} ${file.operator} '${file.value}'`,
      tableId: tid,
      column: file.field, // 分析字段名称
    };
    if (editLogFilterInfo) {
      // edit
      delete data.collectType;
      doEditLogFilter.run(editLogFilterInfo.id, data).then((res: any) => {
        if (res.code != 0) return;
        message.success("success");
        onChangeVisibleLogFilter(false);
        // 以下函数会刷新filterList

        doGetLogsAndHighCharts(tid).then((data: any) => {
          const { logs } = data;
          const pane = logPanesHelper.logPanes[tid];
          onChangeCurrentLogPane({
            ...pane,
            logs: logs,
          });
        });
      });
    } else {
      // add
      doCreateLogFilter.run(data).then((res: any) => {
        if (res.code != 0) return;
        message.success("success");
        onChangeVisibleLogFilter(false);
        // 以下函数会刷新filterList

        doGetLogsAndHighCharts(tid).then((data: any) => {
          const { logs } = data;
          const pane = logPanesHelper.logPanes[tid];
          onChangeCurrentLogPane({
            ...pane,
            logs: logs,
          });
        });
      });
    }
  };

  useEffect(() => {
    if (visibleLogFilter && editLogFilterInfo) {
      const arr = editLogFilterInfo.statement.split(" ");
      let newArr = cloneDeep(arr);
      newArr.splice(0, 2);
      formFilterRef.current?.setFieldsValue({
        field: arr[0],
        operator: arr[1],
        value: newArr.join(" ").replace(/'/g, ""),
        isCustom: editLogFilterInfo.alias ? true : false,
        alias: editLogFilterInfo.alias,
      });
    } else {
      onChangeEditLogFilterInfo(undefined);
      formFilterRef.current?.resetFields();
    }
  }, [visibleLogFilter]);

  return (
    <Modal
      title={
        editLogFilterInfo
          ? i18n.formatMessage({ id: "log.filter.edit.title" })
          : i18n.formatMessage({ id: "log.filter.add.title" })
      }
      visible={visibleLogFilter}
      onOk={() => formFilterRef.current?.submit()}
      onCancel={() => onChangeVisibleLogFilter(false)}
      width={800}
    >
      <Form ref={formFilterRef} layout={"vertical"} onFinish={handleFinish}>
        <div className={classNames([styles.statementBox, styles.title])}>
          <div className={styles.field}>
            <Form.Item
              name={"field"}
              label={i18n.formatMessage({ id: "log.filter.form.field" })}
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: "100%" }}
                placeholder={i18n.formatMessage({
                  id: "log.filter.form.field",
                })}
              >
                {columsList?.map((item: string) => {
                  return (
                    <Option key={item} value={item}>
                      {item}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </div>
          <div className={styles.operator}>
            <Form.Item
              name={"operator"}
              label={i18n.formatMessage({ id: "log.filter.form.operator" })}
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: "200px" }}
                placeholder={i18n.formatMessage({
                  id: "log.filter.form.operator.placeholder",
                })}
              >
                {operatorList.map((item: string) => {
                  return (
                    <Option value={item} key={item}>
                      {item}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </div>
        </div>
        <div className={styles.title}>
          <Form.Item
            label={i18n.formatMessage({ id: "log.filter.form.value" })}
            name={"value"}
            rules={[{ required: true }]}
          >
            <Input
              placeholder={i18n.formatMessage({
                id: "log.filter.form.value.placeholder",
              })}
            />
          </Form.Item>
        </div>
        <div className={classNames([styles.customBox])}>
          <Form.Item name={"isCustom"} noStyle valuePropName="checked">
            <Switch />
          </Form.Item>
          <span style={{ paddingLeft: "10px" }}>
            {i18n.formatMessage({ id: "log.filter.form.isCustom" })}
          </span>
        </div>

        <Form.Item shouldUpdate={(pre, next) => pre.isCustom != next.isCustom}>
          {({ getFieldValue }) => {
            const isCustom = getFieldValue("isCustom");
            if (isCustom) {
              return (
                <div className={classNames([styles.alias, styles.title])}>
                  <div style={{ width: "100%" }}>
                    {i18n.formatMessage({ id: "log.filter.form.custom" })}
                  </div>
                  <Form.Item name={"alias"} noStyle>
                    <Input />
                  </Form.Item>
                </div>
              );
            }
            return <></>;
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreateLogFilter;
