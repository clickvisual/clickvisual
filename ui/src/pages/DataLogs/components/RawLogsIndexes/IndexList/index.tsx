import indexListStyles from "@/pages/DataLogs/components/RawLogsIndexes/IndexList/index.less";
import classNames from "classnames";
import { Empty, Tooltip } from "antd";
import { CaretDownOutlined, CaretUpOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import IndexItem from "@/pages/DataLogs/components/RawLogsIndexes/IndexItem";
import { useIntl } from "umi";
import { IndexInfoType } from "@/services/dataLogs";

type IndexListProps = {
  list: IndexInfoType[];
};
const IndexList = (props: IndexListProps) => {
  const [activeList, setActiveList] = useState<number[]>([]);
  const i18n = useIntl();
  const { list } = props;
  useEffect(() => {
    setActiveList([]);
  }, [list]);
  return (
    <div className={classNames(indexListStyles.indexListMain)}>
      {list.length > 0 ? (
        <ul>
          {list.map((index) => {
            const isActive = activeList.indexOf(index.id) > -1;
            return (
              <div
                className={classNames(indexListStyles.indexRowMain)}
                key={index.id}
              >
                <Tooltip title={index.field} placement={"left"}>
                  <li
                    className={classNames(
                      indexListStyles.indexRow,
                      isActive && indexListStyles.activeIndexRow
                    )}
                    onClick={() => {
                      if (activeList.indexOf(index.id) === -1) {
                        setActiveList(() => [...activeList, index.id]);
                      } else {
                        setActiveList(() =>
                          activeList.filter(
                            (itemActive) => itemActive !== index.id
                          )
                        );
                      }
                    }}
                  >
                    <span className={indexListStyles.title}>{index.field}</span>
                    <div className={indexListStyles.icon}>
                      {isActive ? <CaretUpOutlined /> : <CaretDownOutlined />}
                    </div>
                  </li>
                </Tooltip>
                {isActive && <IndexItem index={index} isActive={isActive} />}
              </div>
            );
          })}
        </ul>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={i18n.formatMessage({ id: "log.index.empty" })}
        />
      )}
    </div>
  );
};
export default IndexList;
