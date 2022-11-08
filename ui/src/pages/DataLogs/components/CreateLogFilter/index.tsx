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

const CreateLogFilter = ({ tables, tid }: { tables: any[]; tid: number }) => {
  const i18n = useIntl();
  const {
    visibleLogFilter,
    onChangeVisibleLogFilter,
    doCreateLogFilter,
    doGetLogFilterList,
    onChangeLogFilterList,
    editLogFilterInfo,
    onChangeEditLogFilterInfo,
    doEditLogFilter,
  } = useModel("dataLogs");
  const formFilterRef = useRef<FormInstance>(null);

  const handleFinish = (file: {
    alias: string;
    field: string;
    isCustom: boolean;
    operator: string;
    value: string;
  }) => {
    const data = {
      alias: file?.isCustom ? file?.alias : undefined,
      collectType: CollectType.tableFilter,
      statement: `${file.field} ${file.operator} '${file.value}'`,
      tableId: tid,
    };
    if (editLogFilterInfo) {
      doEditLogFilter.run(editLogFilterInfo.id, data).then((res: any) => {
        if (res.code != 0) return;
        message.success("success");
        onChangeVisibleLogFilter(false);
        const data = {
          collectType: CollectType.allFilter,
          tableId: tid,
        };
        doGetLogFilterList.run(data).then((res: any) => {
          if (res.code != 0) return;
          onChangeLogFilterList(res.data);
        });
      });
    } else {
      doCreateLogFilter.run(data).then((res: any) => {
        if (res.code != 0) return;
        message.success("success");
        onChangeVisibleLogFilter(false);
        const data = {
          collectType: CollectType.allFilter,
          tableId: tid,
        };
        doGetLogFilterList.run(data).then((res: any) => {
          if (res.code != 0) return;
          onChangeLogFilterList(res.data);
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
        value: newArr.join(" ").match(/[^'].*[^']/g)[0],
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
            <div style={{ width: "100%" }}>
              {i18n.formatMessage({ id: "log.filter.form.field" })}
            </div>
            <Form.Item noStyle name={"field"}>
              <Select
                style={{ width: "100%" }}
                placeholder={i18n.formatMessage({
                  id: "log.filter.form.field",
                })}
              >
                {tables.map((item: string) => {
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
            <div style={{ width: "100%" }}>
              {i18n.formatMessage({ id: "log.filter.form.operator" })}
            </div>
            <Form.Item noStyle name={"operator"}>
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
