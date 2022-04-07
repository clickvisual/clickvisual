import useRequest from "@/hooks/useRequest/useRequest";
import { getEventEnums, getEvents } from "@/services/events";
import { FIRST_PAGE, PAGE_SIZE } from "@/config/config";
import { useState } from "react";

const Events = () => {
  const [currentPagination, setCurrentPagination] = useState<API.Pagination>({
    current: FIRST_PAGE,
    pageSize: PAGE_SIZE,
    total: 0,
  });

  const [eventEnums, setEventEnums] = useState<any>();
  const [query, setQuery] = useState<any>();
  const doGetEvents = useRequest(getEvents, { loadingText: false });

  const doGetEventEnums = useRequest(getEventEnums, {
    loadingText: false,
    onSuccess: (res: { data: any }) => setEventEnums(res.data),
  });

  return {
    doGetEvents,
    eventEnums,
    query,
    setQuery,
    currentPagination,
    setCurrentPagination,
    doGetEventEnums,
  };
};
export default Events;
