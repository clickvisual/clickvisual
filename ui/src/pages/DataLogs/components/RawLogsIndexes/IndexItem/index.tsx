import indexItemStyles from "@/pages/DataLogs/components/RawLogsIndexes/IndexItem/index.less";
import classNames from "classnames";
import { useEffect, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { Progress, Spin, Tooltip } from "antd";
import useRequest from "@/hooks/useRequest/useRequest";
import api, { IndexDetail, IndexInfoType } from "@/services/dataLogs";
import { useIntl } from "umi";

type IndexItemProps = {
  index: IndexInfoType;
  isActive: boolean;
};
const IndexItem = (props: IndexItemProps) => {
  const { index, isActive } = props;
  const { keywordInput, startDateTime, endDateTime, doUpdatedQuery } =
    useModel("dataLogs");

  const i18n = useIntl();

  const getIndexDetails = useRequest(api.getIndexDetail, {
    loadingText: false,
  });
  const [details, setDetails] = useState<IndexDetail[]>([]);

  const insertQuery = (name: string) => {
    const currentSelected = `${index.field}='${name}'`;
    doUpdatedQuery(currentSelected);
  };

  useEffect(() => {
    if (!isActive || !index || !startDateTime || !endDateTime) return;
    const params = {
      st: startDateTime,
      et: endDateTime,
      query: keywordInput,
    };
    getIndexDetails.run(index.tid, index.id, params).then((res) => {
      if (res?.code === 0) {
        setDetails(res.data);
      }
    });
  }, [index, isActive]);
  return (
    <div className={classNames(indexItemStyles.indexItemMain)}>
      <Spin
        spinning={getIndexDetails.loading}
        tip={i18n.formatMessage({ id: "spin" })}
      >
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
                        {detail.indexName === "" ? " " : detail.indexName}
                      </Tooltip>
                    </span>
                  </div>
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
