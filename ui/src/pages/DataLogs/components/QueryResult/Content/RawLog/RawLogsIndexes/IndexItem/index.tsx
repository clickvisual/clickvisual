import useRequest from "@/hooks/useRequest/useRequest";
import indexItemStyles
  from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexItem/index.less";
import api, { IndexDetail, IndexInfoType } from "@/services/dataLogs";
import { useModel } from "@umijs/max";
import { Progress, Spin, Tooltip } from "antd";
import classNames from "classnames";
import { useEffect, useState } from "react";
import { useIntl } from "umi";
import ClickMenu from "@/pages/DataLogs/components/QueryResult/Content/RawLog/ClickMenu";

type IndexItemProps = {
  index: IndexInfoType;
  isActive: boolean;
};
const IndexItem = (props: IndexItemProps) => {
  const { index, isActive } = props;
  const { keywordInput, logFilterList, startDateTime, endDateTime, doUpdatedQuery } =
    useModel("dataLogs");
  const i18n = useIntl();
  const getIndexDetails = useRequest(api.getIndexDetail, {
    loadingText: false,
  });
  const [details, setDetails] = useState<IndexDetail[]>([]);

  const insertQuery = (name: string, exclusion: boolean) => {
    let currentSelected = "";
    let symbol = exclusion ? "!=" : "="
    if (index.rootName != "") {
      currentSelected = `${index.rootName}.${index.field}${symbol}'${name}'`;
    } else {
      currentSelected = `\`${index.field}\`${symbol}'${name}'`;
    }
    doUpdatedQuery(currentSelected);
  };

  useEffect(() => {
    if (
      !isActive ||
      !index?.tid ||
      !index?.id ||
      !startDateTime ||
      !endDateTime ||
      !logFilterList
    )
      return;
    // 循环读取 logFilterList 里的 statement 值，放到 filters 数组中
    let filters: string[] = [];
    logFilterList.forEach((item) => {
      if (item.statement != "") {
        filters.push(item.statement);
      }
    });
    const params = {
      st: startDateTime,
      et: endDateTime,
      query: keywordInput,
      filters: filters,
    };
    getIndexDetails.run(index.tid, index.id, params).then((res) => {
      if (res?.code === 0) {
        setDetails(res.data);
      }
    });
  }, [index, isActive]);

  const indexItem = (detail: IndexDetail) => {
    return (
      <div className={indexItemStyles.title}>
        <span
          className={classNames(
            indexItemStyles.name,
            detail.indexName !== "" && indexItemStyles.nameHover
          )}
        >
          <Tooltip title={detail.indexName} placement={"left"}>
            {detail.indexName === "" ? " " : detail.indexName}
          </Tooltip>
        </span>
      </div>
    )
  }
  return (
    <div className={classNames(indexItemStyles.indexItemMain)}>
      <Spin
        spinning={getIndexDetails.loading}
        tip={i18n.formatMessage({ id: "spin" })}
      >
        <div className={indexItemStyles.detailContextMain}>
          {details.length > 0 ? (
            <>
              {details.map((detail, i) => (
                <div key={i} className={indexItemStyles.context}>
                  {detail.indexName !== "" ? (
                    <ClickMenu
                      field={index.rootName != "" ? `${index.rootName}.${index.field}` : `\`${index.field}\``}
                      content={detail.indexName}
                      handleAddCondition={() => { insertQuery(detail.indexName, false); }}
                      handleOutCondition={() => { insertQuery(detail.indexName, true) }}
                    >
                      {indexItem(detail)}
                    </ClickMenu>
                  ) : (
                    <> {indexItem(detail)} </>
                  )}
                  <div>
                    <Tooltip title={detail.count} placement={"right"}>
                      <div className={indexItemStyles.progressMain}>
                        <Progress
                          strokeColor={"hsl(21, 85%, 56%)"}
                          className={indexItemStyles.progress}
                          percent={detail.percent}
                          showInfo={false}
                          trailColor={"hsla(210, 14%, 83%, 0.4)"}
                          size="small"
                        />
                        <div className={indexItemStyles.percent}>
                          <span>{`${detail.percent}%`}</span>
                        </div>
                      </div>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <span>{i18n.formatMessage({ id: "log.index.item.empty" })}</span>
          )}
        </div>
      </Spin>
    </div>
  );
};
export default IndexItem;
