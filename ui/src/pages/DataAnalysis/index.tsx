import style from "./index.less";
import TemporaryQuery from "@/pages/DataAnalysis/TemporaryQuery";
import RealTimeTrafficFlow from "@/pages/DataAnalysis/RealTimeBusinessFlow";
import DataAnalysisNav from "@/pages/DataAnalysis/Nav";
import DataAnalysisScreening from "@/pages/DataAnalysis/Screening";
import { useIntl, useModel } from "umi";
import { BigDataNavEnum } from "@/pages/DataAnalysis/service/enums";
import { useMemo } from "react";
import OfflineManager from "@/pages/DataAnalysis/OfflineManager";
import { Empty } from "antd";

const DataAnalysis = () => {
  const { navKey, currentInstances } = useModel("dataAnalysis");
  const i18n = useIntl();

  const NavContent = useMemo(() => {
    if (!currentInstances) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={i18n.formatMessage({ id: "datasource.draw.selected" })}
        />
      );
    }
    switch (navKey) {
      case BigDataNavEnum.TemporaryQuery:
        return <TemporaryQuery />;
      case BigDataNavEnum.RealTimeTrafficFlow:
        return <RealTimeTrafficFlow />;
      case BigDataNavEnum.OfflineManage:
        return <OfflineManager />;
      default:
        return <></>;
    }
  }, [navKey, currentInstances]);

  return (
    <div className={style.main}>
      <DataAnalysisScreening />
      <div className={style.contentBox}>
        <DataAnalysisNav />
        <div className={style.content}>{NavContent}</div>
      </div>
    </div>
  );
};

export default DataAnalysis;
export { BigDataNavEnum } from "@/pages/DataAnalysis/service/enums";
