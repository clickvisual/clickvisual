import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useState } from "react";
import { AlarmHistoryRequest, AlarmHistoryType } from "@/services/alarm";
import HistoryTable from "@/pages/Alarm/Rules/components/AlarmHistory/HistoryTable";
import HistoryBoard from "@/pages/Alarm/Rules/components/AlarmHistory/HistoryBorad";
import HistoryOptions from "@/pages/Alarm/Rules/components/AlarmHistory/HistoryOptions";
import useUrlState from "@ahooksjs/use-url-state";
import { Card } from "antd";

const AlarmHistory = () => {
  const [urlState] = useUrlState();
  const [dataList, setDataList] = useState<AlarmHistoryType[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [sucPublish, setSucPublish] = useState<number>(0);
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
      alarmHistory.setCurrentAlarm({ ...res.data, id: parseInt(urlState.id) });
      setQuery({ alarmId: parseInt(urlState.id) });
      loadList({ alarmId: parseInt(urlState.id) });
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
      });
  };

  return (
    <>
      {currentAlarm && (
        <Card title={currentAlarm?.alarmName} bordered={false}>
          <HistoryBoard
            sucPublish={sucPublish}
            total={total}
            dataList={dataList}
          />
          <HistoryOptions loadList={loadList} />
          <HistoryTable loadList={loadList} dataList={dataList} />
        </Card>
      )}
    </>
  );
};
export default AlarmHistory;
