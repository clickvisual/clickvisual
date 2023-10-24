import indexListStyles
  from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexList/index.less";
import indexHeaderStyles
  from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexHeader/index.less";
import IconFont from "@/components/IconFont";
import classNames from "classnames";
import {Button, Collapse, Empty, Spin, Tooltip} from "antd";
import {CaretDownOutlined, CaretUpOutlined, QuestionCircleOutlined,} from "@ant-design/icons";
import {useEffect, useMemo, useState} from "react";
import IndexItem from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexItem";
import {useIntl, useModel} from "umi";
import {IndexInfoType} from "@/services/dataLogs";
import {IndexType} from "../..";

const { Panel } = Collapse;

type IndexListProps = {
  list?: IndexInfoType[];
  indexType: IndexType;
  baseActiveKey: string[];
  logActiveKey: string[];
  activeKey: string[];
  setActiveKey: (str: string[]) => void;
};

const IndexList = (props: IndexListProps) => {
  const {
    list,
    indexType,
    activeKey,
    setActiveKey,
    baseActiveKey,
    logActiveKey,
  } = props;
  const [activeList, setActiveList] = useState<number[]>([]);

  const isBaseField = useMemo(
    () => indexType === IndexType.baseField,
    [indexType]
  );

  const i18n = useIntl();

  const { doGetAnalysisField, onChangeVisibleIndexModal, currentLogLibrary } =
    useModel("dataLogs");

  useEffect(() => {
    setActiveList([]);
  }, [list]);

  const maxHeightClass = useMemo(() => {
    if (
      (baseActiveKey.length == 0 && logActiveKey.length == 0) ||
      (baseActiveKey.length == 1 && logActiveKey.length == 1)
    ) {
      return indexListStyles.fiveFiveOpen;
    }
    if (isBaseField && activeKey.length == 0) {
      return indexListStyles.zero;
    }
    if (!isBaseField && activeKey.length == 0 && baseActiveKey.length == 1 && logActiveKey.length == 0) {
      return indexListStyles.zero;
    }
    if (!isBaseField && baseActiveKey.length == 0 && logActiveKey.length != 0) {
      return indexListStyles.nine;
    }
    if (isBaseField && activeKey.length == 1) {
      return indexListStyles.nine;
    }
    // console.log("isBaseField", isBaseField);
    // console.log("baseActiveKey", baseActiveKey.length);
    // console.log("activeKey", activeKey.length);
    // console.log("logActiveKey", logActiveKey.length);
  }, [isBaseField, activeKey, baseActiveKey, logActiveKey]);

  return (
    <div
      className={classNames([
        indexListStyles.indexListMain,
        isBaseField && activeKey.length == 0 ? indexListStyles.flexNone : "",
        indexType == IndexType.logField && indexListStyles.whiteStripe,
        maxHeightClass,
      ])}
    >
      <Collapse
        activeKey={activeKey}
        bordered={false}
        style={{
          width: "100%",
        }}
        onChange={(e: any) => {
          setActiveKey(e);
        }}
        ghost
      >
        <Panel
          header={
            <div
              style={{
                display: "block",
                justifyContent: "space-around",
              }}
            >
              <div
                  style={{  float:"left"}}
              >
              {isBaseField
                ? i18n.formatMessage({ id: "log.index.baseField" })
                : i18n.formatMessage({ id: "log.index.logField" })}
                </div>
              <div
                className={indexHeaderStyles.icon}
                style={{ marginRight: "5px",float:"right"}}
              >
                {isBaseField ?<Tooltip
                  title={i18n.formatMessage({ id: "log.index.help" })}
                >
                  <a>
                    <QuestionCircleOutlined />
                  </a>
                </Tooltip>:<></>}
              </div>
              {currentLogLibrary?.createType !== 1 && !isBaseField && (
                <div className={indexHeaderStyles.icon}  style={{  float:"right"}}>
                  <Button
                    onClick={() => {
                      onChangeVisibleIndexModal(true);
                    }}
                    type={"link"}
                    size="small"
                    icon={
                      <Tooltip
                        title={i18n.formatMessage({ id: "log.index.manage" })}
                      >
                        <IconFont type={"icon-setting"} />
                      </Tooltip>
                    }
                  />
                </div>
              )}
            </div>
          }
          key="1"
        >
          <Spin spinning={doGetAnalysisField.loading}>
            {list && list?.length > 0 ? (
              <ul style={{paddingBottom:"20px"}}>
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
