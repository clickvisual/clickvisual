import { Drawer, Form, Input } from "antd";
import InspectionFrequencyItem from "@/pages/Alarm/components/FormAlarmDraw/InspectionFrequencyItem";

const FormAlarmDraw = () => {
  return (
    <Drawer
      title={"新增或编辑"}
      visible={true}
      placement="right"
      closable
      getContainer={false}
      width={"45vw"}
      bodyStyle={{ padding: 10 }}
      headerStyle={{ padding: 10 }}
    >
      <Form>
        <Form.Item label={"规则名称"} name={"a"}>
          <Input />
        </Form.Item>
        <Form.Item label={"检查频率"}>
          <InspectionFrequencyItem />
        </Form.Item>
        <Form.Item>
          <Input />
        </Form.Item>
      </Form>
    </Drawer>
  );
};
export default FormAlarmDraw;
