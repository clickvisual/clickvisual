import CustomModal from "@/components/CustomModal";
import { Button, message, Space, Table } from "antd";
import { ColumnsType } from "antd/lib/table";
import { useCallback, useEffect, useState } from "react";
import { useIntl } from "umi";
import SelectFieldStyle from "./index.less";

export interface SelectFieldType {
  visible: boolean;
  onCancel: () => void;
  mappingJson: any;
  onConfirm: (data: { timeField: string }) => void;
}

const SelectField = (props: SelectFieldType) => {
  const { visible, onCancel, mappingJson, onConfirm } = props;
  const i18n = useIntl();
  const [timeSelectedRowKeys, setTimeSelectedRowKeys] = useState<string[]>([]);

  const columns: ColumnsType<any> = [
    { title: "key", dataIndex: "key" },
    { title: "value", dataIndex: "value" },
  ];

  const onTimeSelectChange = useCallback((newSelectedRowKeys: any[]) => {
    setTimeSelectedRowKeys(newSelectedRowKeys);
  }, []);

  const timeRowSelection = {
    timeSelectedRowKeys,
    onChange: onTimeSelectChange,
    getCheckboxProps: (record: any) => ({
      disabled: !(record.value == "String" || record.value == "Float64"),
    }),
  };

  useEffect(() => {
    mappingJson.map((item: any) => {
      if (item.value == "unknown") {
        message.error({
          content: (
            <a
              target="_blank"
              href="https://clickvisual.gocn.vip/clickvisual/02install/quick-start.html#source-%E8%AF%B4%E6%98%8E"
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
      visible={visible}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button
          type={"primary"}
          onClick={() => {
            if (timeSelectedRowKeys.length == 1) {
              onConfirm({
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
        </Space>
      </div>
    </CustomModal>
  );
};
export default SelectField;
