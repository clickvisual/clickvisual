// import queryStatisticsStyles from "@/pages/Alarm/components/FormAlarmDraw/QueryStatisticsItem/index.less";
import { Button, Form, Input, Space } from "antd";
import CreatedAndUpdatedModal from "@/pages/Alarm/components/FormAlarmDraw/QueryStatisticsItem/CreatedAndUpdatedModal";
import { useRef, useState } from "react";
import { FormListOperation } from "antd/es/form/FormList";
import { FieldData } from "rc-field-form/lib/interface";

const QueryStatisticsItem = () => {
  const statisticOptionRef = useRef<FormListOperation>();
  const insertIndex = useRef<number>();

  const [visibleModal, setVisibleModal] = useState<boolean>(false);

  const onChangeVisible = (visible: boolean) => {
    setVisibleModal(visible);
  };

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <span style={{ alignSelf: "start", lineHeight: "32px" }}>检查统计：</span>
      <Form.Item noStyle>
        <Form.List name={"queryStatistics"}>
          {(fields, options, { errors }) => {
            statisticOptionRef.current = options;
            return (
              <div style={{ flex: 1 }}>
                {fields.map((field) => {
                  return (
                    <div key={field.key} style={{ display: "flex" }}>
                      <Form.Item
                        {...fields}
                        name={[field.name, "sql"]}
                        style={{ flex: "0 0 85%", marginRight: "8px" }}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item>
                        <Space>
                          <a
                            onClick={() => {
                              insertIndex.current = field.name + 1;
                              onChangeVisible(true);
                            }}
                          >
                            添加
                          </a>
                          {fields.length > 1 && (
                            <a onClick={() => options.remove(field.name)}>
                              删除
                            </a>
                          )}
                        </Space>
                      </Form.Item>
                    </div>
                  );
                })}
                {fields.length === 0 && (
                  <Button type={"link"} onClick={() => onChangeVisible(true)}>
                    添加
                  </Button>
                )}
              </div>
            );
          }}
        </Form.List>
      </Form.Item>
      <CreatedAndUpdatedModal
        visible={visibleModal}
        onOk={(fields: FieldData) => {
          if (!statisticOptionRef.current) return;
          console.log("fields", fields);
          statisticOptionRef.current.add(fields, insertIndex.current);
          onChangeVisible(false);
        }}
        onCancel={() => onChangeVisible(false)}
      />
    </div>
  );
};
export default QueryStatisticsItem;
