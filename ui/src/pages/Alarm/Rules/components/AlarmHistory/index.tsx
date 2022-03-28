import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useState } from "react";
import { AlarmHistoryRequest, AlarmHistoryType } from "@/services/alarm";
import HistoryTable from "@/pages/Alarm/Rules/components/AlarmHistory/HistoryTable";
import HistoryBoard from "@/pages/Alarm/Rules/components/AlarmHistory/HistoryBorad";
import HistoryOptions from "@/pages/Alarm/Rules/components/AlarmHistory/HistoryOptions";
import useUrlState from "@ahooksjs/use-url-state";
import { Card } from "antd";
import { SelectLang } from "umi";
import historyStyles from "./index.less";

const AlarmHistory = () => {
  const [urlState, setUrlState] = useUrlState<any>();
  const [dataList, setDataList] = useState<AlarmHistoryType[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [sucPublish, setSucPublish] = useState<number>(0);
  const [dashboardUrl, setDashboardUrl] = useState<string>("");
  const [kw, setKw] = useState<string>("");
  const [tid, setTid] = useState<number>(0);
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
      let dashboardPath = "/share?";
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
      const { tid: tids, filters: filterss } = res.data;
      setTid(tids);
      setKw(filterss[0].when);
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
            `/share?end=${params?.endTime}&start=${params?.startTime}`
          );
        let urlData: any = { ...urlState };
        urlData.end = params?.endTime;
        urlData.start = params?.startTime;
        setUrlState(urlData);
      });
  };

  useEffect(() => {
    tid && !getUrlParam("tid") && setDashboardUrl(dashboardUrl + "&tid=" + tid);
  }, [tid, dashboardUrl]);

  useEffect(() => {
    kw && !getUrlParam("kw") && setDashboardUrl(dashboardUrl + "&kw=" + kw);
  }, [kw, dashboardUrl]);

  function getUrlParam(name: string) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
    var r =
      dashboardUrl.split("?").length >= 2 &&
      dashboardUrl.split("?")[1].match(reg); //匹配目标参数
    if (r != null) return unescape(r[2]);
    return null; //返回参数值
  }

  return (
    <>
      {currentAlarm && (
        <Card
          title={
            <a href={"/alarm/rules?name=" + currentAlarm?.alarmName}>
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
          />
          <HistoryOptions loadList={loadList} />
          <HistoryTable loadList={loadList} dataList={dataList} />
        </Card>
      )}
    </>
  );
};
export default AlarmHistory;
