import HistoryBoard from "@/pages/Alarm/Rules/components/AlarmHistory/HistoryBorad";
import HistoryOptions from "@/pages/Alarm/Rules/components/AlarmHistory/HistoryOptions";
import HistoryTable from "@/pages/Alarm/Rules/components/AlarmHistory/HistoryTable";
import { AlarmHistoryRequest, AlarmHistoryType } from "@/services/alarm";
import useUrlState from "@ahooksjs/use-url-state";
import { useModel } from "@umijs/max";
import { Card } from "antd";
import { useEffect, useState } from "react";
import { SelectLang } from "umi";
import historyStyles from "./index.less";

const AlarmHistory = () => {
  const [urlState, setUrlState] = useUrlState<any>();
  const [dataList, setDataList] = useState<AlarmHistoryType[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [sucPublish, setSucPublish] = useState<number>(0);
  const [dashboardUrl, setDashboardUrl] = useState<string>("");
  const { alarmHistory, alarmDraw } = useModel("alarm");
  const { doGetAlarmInfo } = alarmDraw;
  const {
    setQuery,
    currentAlarm,
    setCurrentAlarm,
    currentPagination,
    setCurrentPagination,
    doGetAlarmHistoryList,
  } = alarmHistory;

  useEffect(() => {
    if (!urlState?.id) return;
    doGetAlarmInfo.run(parseInt(urlState.id)).then((res) => {
      if (res?.code !== 0) return;
      alarmHistory.setCurrentAlarm({
        ...res.data,
        id: parseInt(urlState.id),
      });
      let dashboardPath = process.env.PUBLIC_PATH + "share?";
      if (urlState.end && urlState.start) {
        setQuery({
          alarmId: parseInt(urlState.id),
          endTime: urlState.end * 1,
          startTime: urlState.start * 1,
        });
        loadList({
          alarmId: parseInt(urlState.id),
          endTime: urlState.end * 1,
          startTime: urlState.start * 1,
        });
        dashboardPath = `${dashboardPath}end=${urlState.end}&start=${urlState.start}`;
      } else {
        setQuery({ alarmId: parseInt(urlState.id) });
        loadList({ alarmId: parseInt(urlState.id) });
      }
      setDashboardUrl(dashboardPath);
      let urlData = { id: urlState.id };
      setUrlState(urlData);
    });
    return () => setCurrentAlarm(undefined);
  }, []);

  const loadList = (params?: AlarmHistoryRequest) => {
    doGetAlarmHistoryList
      .run({ ...currentPagination, ...params })
      .then((res) => {
        if (!res || res?.code !== 0 || !res.pagination) return;
        setDataList(res.data.list);
        setTotal(res.data.total);
        setSucPublish(res.data.succ);
        setCurrentPagination(res.pagination);
        params?.endTime &&
          params?.startTime &&
          setDashboardUrl(
            process.env.PUBLIC_PATH +
              `share?end=${params?.endTime}&start=${params?.startTime}`
          );
        let urlData: any = { ...urlState };
        urlData.end = params?.endTime;
        urlData.start = params?.startTime;
        setUrlState(urlData);
      });
  };

  return (
    <>
      {currentAlarm && (
        <Card
          title={
            <a
              href={
                process.env.PUBLIC_PATH +
                "alarm/rules?alarmId=" +
                currentAlarm?.id
              }
            >
              {currentAlarm?.alarmName}
            </a>
          }
          bordered={false}
          extra={<SelectLang className={historyStyles.lang} reload={false} />}
        >
          <HistoryBoard
            sucPublish={sucPublish}
            total={total}
            dataList={dataList}
            currentAlarm={currentAlarm}
            dashboardUrl={dashboardUrl}
            filterId={urlState?.filterId}
          />
          <HistoryOptions loadList={loadList} />
          <HistoryTable loadList={loadList} dataList={dataList} />
        </Card>
      )}
    </>
  );
};
export default AlarmHistory;
