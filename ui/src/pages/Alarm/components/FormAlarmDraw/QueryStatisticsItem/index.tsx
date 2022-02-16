import queryStatisticsStyles from "@/pages/Alarm/components/FormAlarmDraw/QueryStatisticsItem/index.less";
import { Button, Form, Space } from "antd";

const QueryStatisticsItem = () => {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <span>检查统计：</span>
      <Form.Item noStyle>
        <Form.List name={"queryStatistics"}>
          {(fields, options, { errors }) => {
            return (
              <>
                {fields.map((field, index) => {
                  return (
                    <div key={field.key} style={{ flex: 1, display: "block" }}>
                      <Space style={{ width: "100%" }}>
                        <Form.Item noStyle>
                          <input />
                        </Form.Item>{" "}
                        <Button type={"link"} onClick={() => options.add()}>
                          add
                        </Button>
                      </Space>
                    </div>
                  );
                })}
                {fields.length === 0 && (
                  <Button type={"link"} onClick={() => options.add()}>
                    添加
                  </Button>
                )}
              </>
            );
          }}
        </Form.List>
      </Form.Item>
    </div>
  );
};
export default QueryStatisticsItem;
