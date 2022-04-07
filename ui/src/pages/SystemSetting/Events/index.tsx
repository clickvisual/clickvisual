import classNames from "classnames";
import eventStyles from "@/pages/SystemSetting/Events/index.less";
import EventList from "@/pages/SystemSetting/Events/EventList";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useState } from "react";
import Operations from "@/pages/SystemSetting/Events/Operations";

const Events = () => {
  const {
    doGetEventEnums,
    setCurrentPagination,
    currentPagination,
    doGetEvents,
  } = useModel("events");
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any[]>([]);

  const loadMoreData = (params?: any) => {
    if (loading) {
      return;
    }
    setLoading(true);
    doGetEvents
      .run({ ...currentPagination, ...params })
      .then((res: any) => {
        if (res?.code !== 0) return;
        if (res.data.list.length === 0) {
          setLoading(false);
          return;
        }
        setData(() => [...data, ...res.data.list]);
        setCurrentPagination(res.data.pagination);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    doGetEventEnums.run();
    loadMoreData();
  }, []);
  return (
    <div
      className={classNames(
        eventStyles.layoutContentMain,
        eventStyles.eventMain
      )}
    >
      <Operations
        loadList={loadMoreData}
        onChangeData={(data: any[]) => setData(data)}
      />
      <EventList loadList={loadMoreData} loading={loading} data={data} />
    </div>
  );
};
export default Events;
