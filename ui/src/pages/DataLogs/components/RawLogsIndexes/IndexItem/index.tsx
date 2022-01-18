import indexItemStyles from "@/pages/DataLogs/components/RawLogsIndexes/IndexItem/index.less";
import classNames from "classnames";
import { useEffect, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { Progress, Spin, Tooltip } from "antd";
import useRequest from "@/hooks/useRequest/useRequest";
import api, { IndexDetail } from "@/services/dataLogs";

type IndexItemProps = {
  index: string;
  isActive: boolean;
};
const IndexItem = (props: IndexItemProps) => {
  const { index, isActive } = props;
  const {
    currentDatabase,
    keywordInput,
    currentLogLibrary,
    startDateTime,
    endDateTime,
    doUpdatedQuery,
  } = useModel("dataLogs");

  const getIndexDetails = useRequest(api.getIndexDetail, {
    loadingText: false,
  });
  const [details, setDetails] = useState<IndexDetail[]>([]);

  const insertQuery = (name: string) => {
    const currentSelected = `${index}='${name}'`;
    doUpdatedQuery(currentSelected);
  };

  useEffect(() => {
    if (
      !isActive ||
      !currentDatabase ||
      !currentLogLibrary ||
      !startDateTime ||
      !endDateTime
    )
      return;
    const params = {
      dt: currentDatabase.datasourceType,
      in: currentDatabase.instanceName,
      db: currentDatabase.databaseName,
      table: currentLogLibrary,
      field: index,
      st: startDateTime,
      et: endDateTime,
      query: keywordInput,
    };
    getIndexDetails.run(params).then((res) => {
      if (res?.code === 0) {
        setDetails(res.data);
      }
    });
  }, [index, isActive]);
  return (
    <div className={classNames(indexItemStyles.indexItemMain)}>
      <Spin spinning={getIndexDetails.loading} tip={"加载中..."}>
        <div className={indexItemStyles.detailContextMain}>
          {details.length > 0 ? (
            <>
              {details.map((detail, index) => (
                <div key={index} className={indexItemStyles.context}>
                  <div
                    className={indexItemStyles.title}
                    onClick={() => {
                      if (detail.indexName !== "")
                        insertQuery(detail.indexName);
                    }}
                  >
                    <span
                      className={classNames(
                        indexItemStyles.name,
                        detail.indexName !== "" && indexItemStyles.nameHover
                      )}
                    >
                      <Tooltip title={detail.indexName} placement={"left"}>
                        {detail.indexName === "" ? "null" : detail.indexName}
                      </Tooltip>
                    </span>
                  </div>
                  <div>
                    <Tooltip title={detail.count} placement={"right"}>
                      <div className={indexItemStyles.progressMain}>
                        <Progress
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
            <span>暂无数据</span>
          )}
        </div>
      </Spin>
    </div>
  );
};
export default IndexItem;
