import { Avatar, Divider, List } from "antd";
import { useEffect } from "react";
import { useModel } from "@@/plugin-model/useModel";
import InfiniteScroll from "react-infinite-scroll-component";
import eventStyles from "@/pages/SystemSetting/Events/index.less";
import styles from "@/components/RightContent/index.less";
import { UserOutlined } from "@ant-design/icons";
import { FIRST_PAGE, PAGE_SIZE } from "@/config/config";
import { useIntl } from "umi";
import moment from "moment";

type EventListProps = {
  loading: boolean;
  data: any[];
  loadList: (params?: any) => void;
};
const EventList = ({ loading, data, loadList }: EventListProps) => {
  const i18n = useIntl();
  const { setCurrentPagination, currentPagination, query } = useModel("events");

  useEffect(() => {
    return () =>
      setCurrentPagination({
        pageSize: PAGE_SIZE,
        current: FIRST_PAGE,
        total: 0,
      });
  }, []);

  return (
    <div id="scrollableDiv" className={eventStyles.eventList}>
      <InfiniteScroll
        dataLength={data.length}
        next={() =>
          loadList({ current: currentPagination.current + 1, ...query })
        }
        hasMore={data.length < (currentPagination.total as number)}
        loader={loading && <>loading....</>}
        endMessage={
          <Divider plain>
            {i18n.formatMessage({ id: "events.list.noMore" })} 🤐
          </Divider>
        }
        scrollableTarget="scrollableDiv"
      >
        <List
          dataSource={data}
          renderItem={(item: any) => (
            <List.Item key={item.id}>
              <List.Item.Meta
                avatar={
                  <Avatar
                    size="small"
                    className={styles.avatar}
                    icon={<UserOutlined />}
                  />
                }
                title={item.userName}
                description={
                  <span>
                    {moment(item.ctime * 1000).format("YYYY-MM-DD hh:mm:ss")} &nbsp;
                      {item.sourceName}&nbsp;-&gt;&nbsp;
                    {item.operationName}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      </InfiniteScroll>
    </div>
  );
};
export default EventList;
