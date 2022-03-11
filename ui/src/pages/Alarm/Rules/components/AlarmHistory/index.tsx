import { Drawer } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useState } from "react";
import { AlarmHistoryRequest, AlarmHistoryType } from "@/services/alarm";
import HistoryTable from "@/pages/Alarm/Rules/components/AlarmHistory/HistoryTable";
import HistoryBoard from "@/pages/Alarm/Rules/components/AlarmHistory/HistoryBorad";
import HistoryOptions from "@/pages/Alarm/Rules/components/AlarmHistory/HistoryOptions";

const AlarmHistory = () => {
  const [dataList, setDataList] = useState<AlarmHistoryType[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [sucPublish, setSucPublish] = useState<number>(0);
  const { alarmHistory } = useModel("alarm");
  const {
    setQuery,
    setHistoryVisible,
    historyVisible,
    currentAlarm,
    setCurrentAlarm,
    currentPagination,
    setCurrentPagination,
    doGetAlarmHistoryList,
  } = alarmHistory;

  const onClose = () => {
    setHistoryVisible(false);
  };

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

  useEffect(() => {
    if (historyVisible && currentAlarm) {
      setQuery({ alarmId: currentAlarm.id });
      loadList({ alarmId: currentAlarm.id });
    }
  }, [historyVisible, currentAlarm]);

  useEffect(() => {
    if (!historyVisible) setCurrentAlarm(undefined);
  }, [historyVisible]);
  return (
    <>
      {currentAlarm && (
        <Drawer
          closable
          destroyOnClose
          getContainer={false}
          bodyStyle={{
            margin: 10,
            padding: 0,
            display: "flex",
            flexDirection: "column",
          }}
          headerStyle={{ padding: 10 }}
          title={currentAlarm.alarmName}
          visible={historyVisible}
          onClose={onClose}
          width={"55vw"}
        >
          <HistoryBoard
            sucPublish={sucPublish}
            total={total}
            dataList={dataList}
          />
          <HistoryOptions loadList={loadList} />
          <HistoryTable loadList={loadList} dataList={dataList} />
        </Drawer>
      )}
    </>
  );
};
export default AlarmHistory;
