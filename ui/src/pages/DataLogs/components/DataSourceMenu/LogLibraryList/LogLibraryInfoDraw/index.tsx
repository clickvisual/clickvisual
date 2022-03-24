import infoStyles from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/LogLibraryInfoDraw/index.less";
import { TableInfoResponse, TablesResponse } from "@/services/dataLogs";
import { useEffect, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { Drawer, Select, Tooltip } from "antd";
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

  const infoData = [
    {
      id: 101,
      title: i18n.formatMessage({
        id: "datasource.logLibrary.from.creationMode",
      }),
      content: i18n.formatMessage({
        id: `datasource.logLibrary.from.creationMode.option.${
          logLibrary?.createType === 0 ? "newLogLibrary" : "logLibrary"
        }`,
      }),
      tooltip: false,
    },
    {
      id: 102,
      title: i18n.formatMessage({
        id: "datasource.logLibrary.from.newLogLibrary.timeResolutionField",
      }),
      content: libraryInfo?.timeField,
      tooltip: true,
    },
    {
      id: 103,
      title: i18n.formatMessage({ id: "datasource.logLibrary.from.type" }),
      content: logLibraryTypes.find((item) => item.value === libraryInfo?.typ)
        ?.type,
      tooltip: false,
    },
    {
      id: 104,
      title: i18n.formatMessage({ id: "datasource.logLibrary.from.days" }),
      content: libraryInfo?.days,
      tooltip: false,
    },
    {
      id: 105,
      title: i18n.formatMessage({ id: "datasource.logLibrary.from.topics" }),
      content: libraryInfo?.topic,
      tooltip: false,
    },
    {
      id: 106,
      title: i18n.formatMessage({ id: "datasource.logLibrary.from.brokers" }),
      content: libraryInfo?.brokers,
      tooltip: false,
    },
    {
      id: 107,
      title: i18n.formatMessage({ id: "datasource.logLibrary.info.sql" }),
      content: "",
      tooltip: false,
      Select: (
        <Select
          value={selectSql}
          onChange={onChangeSelectSql}
          showSearch
          className={classNames(infoStyles.selectBar)}
          placeholder={`${i18n.formatMessage({
            id: "datasource.logLibrary.info.placeholder.sql",
          })}`}
        >
          {libraryInfo?.sqlContent.keys.map((item) => (
            <Option key={item} value={item}>
              {item}
            </Option>
          ))}
        </Select>
      ),
    },
  ];

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
      title={`${libraryInfo.name}`}
      placement="right"
      closable
      getContainer={false}
      width={"60vw"}
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
        {infoData.map((item: any) => (
          <div className={infoStyles.item} key={item.id}>
            <div className={infoStyles.title}>{item.title}: </div>
            {item.Select ||
              (item.tooltip ? (
                <Tooltip title={item.content}>
                  <div className={infoStyles.content}>
                    {item.content || "-"}
                  </div>
                </Tooltip>
              ) : (
                <div className={infoStyles.content}>{item.content || "-"}</div>
              ))}
          </div>
        ))}
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
