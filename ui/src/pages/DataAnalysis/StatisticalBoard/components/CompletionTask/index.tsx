import CustomCard from "@/components/CustomCard";
import { dashboardDataType } from "../..";
import TaskLineChart from "./TaskLineChart";

const CompletionTask = (props: { dataList: dashboardDataType["flows"] }) => {
  const { dataList } = props;

  return (
    <CustomCard
      title={"任务完成情况"}
      style={{ flex: 1 }}
      content={<TaskLineChart dataList={dataList} />}
    />
  );
};
export default CompletionTask;
