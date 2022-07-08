import nodeStyles from "@/pages/DataAnalysis/RealTimeBusinessFlow/components/BusinessChart/styles/nodeContent.less";
import { BusinessChartResponse } from "@/services/realTimeTrafficFlow";
import { Tooltip } from "antd";
import { useIntl } from "umi";
import { byteConvert } from "@/utils/byteConvertUtil";
import classNames from "classnames";

interface NodeContentProps {
  node: BusinessChartResponse;
}

const NodeContent = ({ node }: NodeContentProps) => {
  const i18n = useIntl();
  return (
    <div className={classNames(nodeStyles.nodeContentMain)}>
      <div className={nodeStyles.tableAndDatabase}>
        <span>
          {i18n.formatMessage({
            id: "bigdata.realtime.table",
          })}
          :&nbsp;
        </span>
        <Tooltip title={node.table} placement={"left"}>
          <div className={classNames(nodeStyles.context, nodeStyles.textAlign)}>
            <span>{node.table}</span>
          </div>
        </Tooltip>
      </div>
      <div className={nodeStyles.tableAndDatabase}>
        <span>
          {i18n.formatMessage({
            id: "bigdata.realtime.database",
          })}
          :&nbsp;
        </span>
        <Tooltip title={node.database} placement={"left"}>
          <div className={classNames(nodeStyles.context, nodeStyles.textAlign)}>
            <span>{node.database}</span>
          </div>
        </Tooltip>
      </div>
      <div className={nodeStyles.textAlign}>
        <span>{i18n.formatMessage({ id: "type" })}:&nbsp;</span>
        {node.engine}
      </div>
      <div className={nodeStyles.capacity}>
        <div>
          <span>{i18n.formatMessage({ id: "capacity" })}:&nbsp;</span>
          <span>{byteConvert(node.totalBytes)}</span>
        </div>
        <div>
          <span>{i18n.formatMessage({ id: "count" })}:&nbsp;</span>
          <span>{node.totalRows}</span>
        </div>
      </div>
    </div>
  );
};

export default NodeContent;
