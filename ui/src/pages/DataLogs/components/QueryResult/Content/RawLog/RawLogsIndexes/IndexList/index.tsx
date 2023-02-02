import indexListStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexList/index.less";
import classNames from "classnames";
import { Empty, Spin, Tooltip } from "antd";
import { CaretDownOutlined, CaretUpOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import IndexItem from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexItem";
import { useIntl, useModel } from "umi";
import { IndexInfoType } from "@/services/dataLogs";
import { Collapse } from "antd";
import { IndexType } from "..";

const { Panel } = Collapse;

type IndexListProps = {
  list?: IndexInfoType[];
  indexType: IndexType;
};

const IndexList = (props: IndexListProps) => {
  const { list, indexType } = props;
  const [activeList, setActiveList] = useState<number[]>([]);

  const isBaseField = useMemo(
    () => indexType === IndexType.baseField,
    [indexType]
  );

  const [activeKey, setActiveKey] = useState<string[]>(
    isBaseField ? [] : ["1"]
  );
  const i18n = useIntl();

  const { doGetAnalysisField } = useModel("dataLogs");

  useEffect(() => {
    setActiveList([]);
  }, [list]);

  useEffect;

  return (
    <div
      className={classNames([
        indexListStyles.indexListMain,
        isBaseField && activeKey.length == 0 ? indexListStyles.flexNone : "",
        indexType == IndexType.logField && indexListStyles.borderTop,
      ])}
    >
      <Collapse
        // defaultActiveKey={isBaseField ? [] : ["1"]}
        activeKey={activeKey}
        bordered={false}
        style={{ width: "100%" }}
        onChange={(e: any) => {
          setActiveKey(e);
        }}
        ghost
      >
        <Panel
          header={
            isBaseField
              ? i18n.formatMessage({ id: "log.index.baseField" })
              : i18n.formatMessage({ id: "log.index.logField" })
          }
          key="1"
        >
          <Spin spinning={doGetAnalysisField.loading}>
            {list && list?.length > 0 ? (
              <ul>
                {list.map((index) => {
                  const isActive = activeList.indexOf(index.id as number) > -1;
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
                            if (activeList.indexOf(index.id as number) === -1) {
                              setActiveList(() => [
                                ...activeList,
                                index.id as number,
                              ]);
                            } else {
                              setActiveList(() =>
                                activeList.filter(
                                  (itemActive) => itemActive !== index.id
                                )
                              );
                            }
                          }}
                        >
                          <span className={indexListStyles.title}>
                            {index.rootName === ""
                              ? index.rootName
                              : `${index.rootName}.`}
                            {index.field}
                          </span>
                          <div className={indexListStyles.icon}>
                            {isActive ? (
                              <CaretUpOutlined />
                            ) : (
                              <CaretDownOutlined />
                            )}
                          </div>
                        </li>
                      </Tooltip>
                      {isActive && (
                        <IndexItem index={index} isActive={isActive} />
                      )}
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
          </Spin>
        </Panel>
      </Collapse>
    </div>
  );
};
export default IndexList;
