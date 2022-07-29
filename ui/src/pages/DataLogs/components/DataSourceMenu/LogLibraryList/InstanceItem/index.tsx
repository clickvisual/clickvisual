import { Tooltip } from "antd";
import { useIntl } from "umi";
import logLibraryListStyles from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/index.less";

const InstanceItem = (props: { instanceItem: any }) => {
  const { instanceItem } = props;
  const i18n = useIntl();

  const tooltipTitle = (
    <div>
      <div className={logLibraryListStyles.logTipTitle}>
        <span>{i18n.formatMessage({ id: "instance.instanceName" })}:</span>
      </div>
      <div>
        <span>{instanceItem.instanceName}</span>
      </div>
      <div>
        <div className={logLibraryListStyles.logTipTitle}>
          {i18n.formatMessage({ id: "DescAsAlias" })}
          :&nbsp;
        </div>
        <div>{!instanceItem?.desc ? "" : instanceItem.desc}</div>
      </div>
    </div>
  );
  return (
    <>
      <Tooltip
        title={tooltipTitle}
        placement="right"
        overlayClassName={logLibraryListStyles.logLibraryToolTip}
        overlayInnerStyle={{ width: 300 }}
      >
        <div style={{ width: "100%" }}>
          {instanceItem.instanceName}
          {instanceItem.desc.length > 0 ? " | " + instanceItem.desc : ""}
        </div>
      </Tooltip>
    </>
  );
};
export default InstanceItem;
