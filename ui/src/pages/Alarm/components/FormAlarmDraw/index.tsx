import { Drawer, Form, Input } from "antd";
import InspectionFrequencyItem from "@/pages/Alarm/components/FormAlarmDraw/InspectionFrequencyItem";
import QueryStatisticsItem from "@/pages/Alarm/components/FormAlarmDraw/QueryStatisticsItem";

const FormAlarmDraw = () => {
  return (
    <Drawer
      title={"新增或编辑"}
      visible={true}
      placement="right"
      closable
      getContainer={false}
      width={700}
      bodyStyle={{ padding: 10 }}
      headerStyle={{ padding: 10 }}
    >
      <Form>
        <Form.Item label={"规则名称"} name={"a"}>
          <Input />
        </Form.Item>
        <Form.Item noStyle>
          <InspectionFrequencyItem />
        </Form.Item>
        <Form.Item noStyle>
          <QueryStatisticsItem />
        </Form.Item>
      </Form>
    </Drawer>
  );
};
export default FormAlarmDraw;
