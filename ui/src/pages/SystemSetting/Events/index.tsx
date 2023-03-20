import EventList from "@/pages/SystemSetting/Events/EventList";
import eventStyles from "@/pages/SystemSetting/Events/index.less";
import Operations from "@/pages/SystemSetting/Events/Operations";
import useUrlState from "@ahooksjs/use-url-state";
import { useModel } from "@umijs/max";
import classNames from "classnames";
import { useEffect, useState } from "react";

const Events = () => {
  const {
    doGetEventEnums,
    setCurrentPagination,
    currentPagination,
    doGetEvents,
  } = useModel("events");
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any[]>([]);
  const [uslState] = useUrlState<any[]>([]);

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
        if (params.current == 1) {
          setData(() => [...res.data.list]);
        } else {
          setData(() => [...data, ...res.data.list]);
        }
        setCurrentPagination(res.data.pagination);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    doGetEventEnums.run();
    loadMoreData({ ...uslState, current: 1 });
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
