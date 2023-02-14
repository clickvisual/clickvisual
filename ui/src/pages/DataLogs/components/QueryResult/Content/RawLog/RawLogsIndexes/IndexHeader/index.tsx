import indexHeaderStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsIndexes/IndexHeader/index.less";
import IconFont from "@/components/IconFont";
import { Button, Space, Tooltip } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { IndexType } from "../..";
import classNames from "classnames";
import { useMemo } from "react";

const IndexHeader = ({ indexType }: { indexType: IndexType }) => {
  const { onChangeVisibleIndexModal, currentLogLibrary } = useModel("dataLogs");
  const i18n = useIntl();

  const isBaseField = useMemo(() => {
    return indexType == IndexType.baseField;
  }, [indexType]);

  return (
    <div
      className={classNames([
        indexHeaderStyles.indexHeaderMain,
        !isBaseField && indexHeaderStyles.whiteStripe,
      ])}
    >
      <Space>
        <span className={indexHeaderStyles.title}>
          {isBaseField
            ? i18n.formatMessage({ id: "log.index.baseField" })
            : i18n.formatMessage({ id: "log.index.logField" })}
        </span>
        <div className={indexHeaderStyles.icon}>
          <Tooltip
            placement={"right"}
            title={i18n.formatMessage({ id: "log.index.help" })}
          >
            <a>
              <QuestionCircleOutlined />
            </a>
          </Tooltip>
        </div>
      </Space>
      {currentLogLibrary?.createType !== 1 && !isBaseField && (
        <div className={indexHeaderStyles.icon}>
          <Button
            onClick={() => {
              onChangeVisibleIndexModal(true);
            }}
            type={"link"}
            icon={
              <Tooltip title={i18n.formatMessage({ id: "log.index.manage" })}>
                <IconFont type={"icon-setting"} />
              </Tooltip>
            }
          />
        </div>
      )}
    </div>
  );
};

export default IndexHeader;
