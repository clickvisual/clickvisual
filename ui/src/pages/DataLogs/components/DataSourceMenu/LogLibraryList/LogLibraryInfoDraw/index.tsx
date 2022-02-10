import infoStyles from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/LogLibraryInfoDraw/index.less";
import { TableInfoResponse, TablesResponse } from "@/services/dataLogs";
import { useEffect, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { Drawer, Select } from "antd";
import MonacoEditor from "react-monaco-editor";
import { useIntl } from "umi";
import { logLibraryTypes } from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary";
import classNames from "classnames";

const { Option } = Select;

type LogLibraryInfoDrawProps = {
  logLibrary: TablesResponse;
};
const LogLibraryInfoDraw = (props: LogLibraryInfoDrawProps) => {
  const {
    logLibraryInfoDrawVisible,
    onChangeLogLibraryInfoDrawVisible,
    doGetLogLibrary,
  } = useModel("dataLogs");
  const i18n = useIntl();

  const [libraryInfo, setLibraryInfo] = useState<
    TableInfoResponse | undefined
  >();
  const [selectSql, setSelectSql] = useState<string>();

  const onChangeSelectSql = (sqlKey: string) => {
    setSelectSql(sqlKey);
  };

  const { logLibrary } = props;

  useEffect(() => {
    if (logLibraryInfoDrawVisible) {
      doGetLogLibrary.run(logLibrary?.id).then((res) => {
        if (res?.code === 0) {
          setLibraryInfo(res.data);
          const sqlKeys = res.data.sqlContent.keys;
          if (sqlKeys.length > 0) setSelectSql(sqlKeys[0]);
        }
      });
    }
  }, [logLibraryInfoDrawVisible]);

  if (!libraryInfo) return <></>;

  return (
    <Drawer
      title={libraryInfo.name}
      placement="right"
      closable
      getContainer={false}
      width={"40vw"}
      bodyStyle={{
        margin: 10,
        padding: 0,
        display: "flex",
        flexDirection: "column",
      }}
      headerStyle={{ padding: 10 }}
      visible={logLibraryInfoDrawVisible}
      onClose={() => onChangeLogLibraryInfoDrawVisible(false)}
    >
      <div className={infoStyles.infoMain}>
        <div className={infoStyles.firstLine}>
          <div>
            <span className={classNames(infoStyles.title)}>
              {i18n.formatMessage({ id: "datasource.logLibrary.from.type" })}
            </span>
            <span>:&nbsp;</span>
            <span>
              {
                logLibraryTypes.find((item) => item.value === libraryInfo.typ)
                  ?.type
              }
            </span>
          </div>
          <div>
            <span className={classNames(infoStyles.title)}>
              {i18n.formatMessage({ id: "datasource.logLibrary.from.days" })}
            </span>
            <span>:&nbsp;</span>
            <span>{libraryInfo.days}</span>
          </div>
          <div>
            <span className={classNames(infoStyles.title)}>
              {i18n.formatMessage({ id: "datasource.logLibrary.from.topics" })}
            </span>
            <span>:&nbsp;</span>
            <span>{libraryInfo.topic}</span>
          </div>
        </div>
        <div>
          <span className={classNames(infoStyles.title)}>
            {i18n.formatMessage({ id: "datasource.logLibrary.from.brokers" })}
          </span>
          <span>:&nbsp;</span>
          <span>{libraryInfo.brokers}</span>
        </div>
        <div>
          <span className={classNames(infoStyles.title)}>
            {i18n.formatMessage({ id: "datasource.logLibrary.info.sql" })}
          </span>
          <span>:&nbsp;</span>
          <Select
            value={selectSql}
            onChange={onChangeSelectSql}
            showSearch
            className={classNames(infoStyles.selectBar)}
            placeholder={`${i18n.formatMessage({
              id: "datasource.logLibrary.info.placeholder.sql",
            })}`}
          >
            {libraryInfo.sqlContent.keys.map((item) => (
              <Option key={item} value={item}>
                {item}
              </Option>
            ))}
          </Select>
        </div>
      </div>
      <div className={infoStyles.infoEditor}>
        <MonacoEditor
          height={"100%"}
          language={"sql"}
          theme="vs-dark"
          value={selectSql && libraryInfo.sqlContent.data[selectSql]}
          options={{
            automaticLayout: true,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            scrollbar: { alwaysConsumeMouseWheel: false },
          }}
        />
      </div>
    </Drawer>
  );
};
export default LogLibraryInfoDraw;
