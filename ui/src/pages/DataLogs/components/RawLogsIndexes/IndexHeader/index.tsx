import indexHeaderStyles from "@/pages/DataLogs/components/RawLogsIndexes/IndexHeader/index.less";
import IconFont from "@/components/IconFont";
import { Tooltip } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";

const IndexHeader = () => {
  const { onChangeVisibleIndexModal } = useModel("dataLogs");
  const i18n = useIntl();
  return (
    <div className={indexHeaderStyles.indexHeaderMain}>
      <span className={indexHeaderStyles.title}>
        {i18n.formatMessage({ id: "log.index.header.title" })}
      </span>
      <div className={indexHeaderStyles.icon}>
        <Tooltip title={i18n.formatMessage({ id: "log.index.manage" })}>
          <IconFont
            onClick={() => {
              onChangeVisibleIndexModal(true);
            }}
            type={"icon-index"}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default IndexHeader;
