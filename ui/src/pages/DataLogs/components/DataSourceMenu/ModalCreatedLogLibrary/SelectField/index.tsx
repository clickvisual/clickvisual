import CustomModal from "@/components/CustomModal";
import { Button, message, Space, Table } from "antd";
import { ColumnsType } from "antd/lib/table";
import { useCallback, useEffect, useState } from "react";
import { useIntl } from "umi";
import SelectFieldStyle from "./index.less";

export interface SelectFieldType {
  open: boolean;
  onCancel: () => void;
  mappingJson: any;
  onConfirm: (data: { rawLogField: string; timeField: string }) => void;
}

const SelectField = (props: SelectFieldType) => {
  const { open, onCancel, mappingJson, onConfirm } = props;
  const i18n = useIntl();
  const [rawLogSelectedRowKeys, setRawLogSelectedRowKeys] = useState<string[]>(
    []
  );
  const [timeSelectedRowKeys, setTimeSelectedRowKeys] = useState<string[]>([]);

  const columns: ColumnsType<any> = [
    { title: "key", dataIndex: "key" },
    { title: "value", dataIndex: "value" },
  ];

  const onRawLogSelectChange = useCallback((newSelectedRowKeys: any[]) => {
    setRawLogSelectedRowKeys(newSelectedRowKeys);
  }, []);

  const onTimeSelectChange = useCallback((newSelectedRowKeys: any[]) => {
    setTimeSelectedRowKeys(newSelectedRowKeys);
  }, []);

  const rawLogRowSelection = {
    rawLogSelectedRowKeys,
    onChange: onRawLogSelectChange,
    getCheckboxProps: (record: any) => ({
      disabled:
        record.key === timeSelectedRowKeys[0] || record.value != "String",
    }),
  };

  const timeRowSelection = {
    timeSelectedRowKeys,
    onChange: onTimeSelectChange,
    getCheckboxProps: (record: any) => ({
      disabled:
        record.key === rawLogSelectedRowKeys[0] ||
        !(record.value == "String" || record.value == "Float64"),
    }),
  };

  useEffect(() => {
    mappingJson.map((item: any) => {
      if (item.value == "unknown") {
        message.error({
          content: (
            <a
              target="_blank"
              href="https://clickvisual.net/zh/clickvisual/02install/quick-start.html#第六步-创建日志库"
            >
              {i18n.formatMessage({
                id: "datasource.logLibrary.from.souceTips",
              })}
            </a>
          ),
          duration: 6,
        });
      }
    });
  }, [mappingJson]);

  return (
    <CustomModal
      title={i18n.formatMessage({
        id: "datasource.logLibrary.selectField.title",
      })}
      open={open}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button
          type={"primary"}
          onClick={() => {
            if (
              rawLogSelectedRowKeys.length == 1 &&
              timeSelectedRowKeys.length == 1
            ) {
              onConfirm({
                rawLogField: rawLogSelectedRowKeys[0],
                timeField: timeSelectedRowKeys[0],
              });
              onCancel();
            } else {
              message.warning(
                i18n.formatMessage({
                  id: "datasource.logLibrary.selectField.okTips",
                })
              );
            }
          }}
        >
          {i18n.formatMessage({ id: "button.ok" })}
        </Button>,
      ]}
    >
      <div className={SelectFieldStyle.flexBox}>
        <div className={SelectFieldStyle.titleRow}>
          <div className={SelectFieldStyle.titleText}>
            {i18n.formatMessage({
              id: "datasource.logLibrary.from.label.timeField",
            })}
          </div>
          <div className={SelectFieldStyle.titleText}>
            {i18n.formatMessage({
              id: "datasource.logLibrary.from.rawLogField",
            })}
          </div>
        </div>
        <Space>
          <Table
            size={"small"}
            rowKey={(item: any) => item.key}
            columns={columns}
            dataSource={mappingJson}
            rowSelection={{ ...timeRowSelection, type: "radio" }}
            pagination={false}
            scroll={{ y: 500 }}
            loading={false}
          />
          <Table
            size={"small"}
            rowKey={(item: any) => item.key}
            columns={columns}
            dataSource={mappingJson}
            rowSelection={{ ...rawLogRowSelection, type: "radio" }}
            pagination={false}
            scroll={{ y: 500 }}
            loading={false}
          />
        </Space>
      </div>
    </CustomModal>
  );
};
export default SelectField;
