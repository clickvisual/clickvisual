import CustomCard from "@/components/CustomCard";
import { useIntl } from "umi";
import { dashboardDataType } from "../..";
import TaskLineChart from "./TaskLineChart";

const CompletionTask = (props: { dataList: dashboardDataType["flows"] }) => {
  const { dataList } = props;
  const i18n = useIntl();

  return (
    <CustomCard
      title={i18n.formatMessage({
        id: "bigdata.dataAnalysis.statisticalBoard.CompletionTask.title",
      })}
      style={{ flex: 1 }}
      content={<TaskLineChart dataList={dataList} />}
    />
  );
};
export default CompletionTask;
