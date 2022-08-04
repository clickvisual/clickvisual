import { Drawer, Table, Tooltip } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";
import { useModel, useIntl } from "umi";
import MonacoEditor from "react-monaco-editor";
import { format } from "sql-formatter";

const VersionHistory = (props: {
  visible: boolean;
  setVisible: (flag: boolean) => void;
  node: any;
  onChangeVersionHistoryList: any;
  versionHistoryList: any;
  currentPagination: any;
  onChangeCurrentPagination: any;
  currentPaneActiveKey: string;
}) => {
  const {
    visible,
    setVisible,
    node,
    onChangeVersionHistoryList,
    versionHistoryList,
    currentPagination,
    onChangeCurrentPagination,
    currentPaneActiveKey,
  } = props;
  const i18n = useIntl();

  const [visibleQuery, setVisibleQuery] = useState<boolean>(false);
  const [content, setContent] = useState<string>("");
  const [sqlLanguage, setSqlLanguage] = useState<string>("mysql");

  const { doNodeHistories, doNodeHistoriesInfo } = useModel("dataAnalysis");

  const getList = (page: number, pageSize: number) => {
    if (node?.id != currentPaneActiveKey) return;
    node.id &&
      doNodeHistories
        .run(node.id as number, {
          current: page,
          pageSize,
          isExcludeCrontabResult: 0,
        })
        .then((res: any) => {
          if (res.code == 0) {
            onChangeVersionHistoryList(res.data);
            onChangeCurrentPagination({
              current: page,
              pageSize: pageSize,
              total: res.data.total,
            });
          }
          return;
        });
  };

  useEffect(() => {
    if (!visible) {
      onChangeVersionHistoryList({ list: [], total: 0 });
    }
  }, [visible]);

  const onClose = () => {
    setVisible(false);
  };

  const handleContentData = (value: string) => {
    if (isJsonString(value)) {
      var jsonObj = JSON.parse(value);
      return JSON.stringify(jsonObj, null, 4);
    }
    return format(value);
  };

  const columns: any = [
    {
      title: i18n.formatMessage({
        id: "bigdata.components.RightMenu.versions",
      }),
      dataIndex: "uuid",
      key: "uuid",
      ellipsis: { showTitle: true },
      render: (_: any, record: any) => (
        <Tooltip title={record.uuid}>{record.uuid}</Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({
        id: "bigdata.components.RightMenu.VersionHistory.submitter",
      }),
      dataIndex: "userName",
      key: "userName",
      render: (_: any, record: any) => (
        <Tooltip title={record.uid}>{record.userName}</Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({
        id: "bigdata.components.RightMenu.VersionHistory.SubmitTime",
      }),
      dataIndex: "utime",
      key: "utime",
      ellipsis: { showTitle: true },
      render: (_: any, record: any) => (
        <Tooltip
          title={moment(record.utime, "X").format("YYYY-MM-DD HH:mm:ss")}
        >
          {moment(record.utime, "X").format("MM-DD HH:mm:ss")}
        </Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({ id: "operation" }),
      dataIndex: "operation",
      key: "operation",
      width: 100,
      render: (_: any, record: any) => (
        <a
          onClick={() => {
            if (node?.id != currentPaneActiveKey) return;
            doNodeHistoriesInfo
              .run(node.id as number, record.uuid)
              .then((res: any) => {
                if (res.code == 0) {
                  setContent(res.data.content);
                  setVisibleQuery(true);
                }
              });
          }}
        >
          {i18n.formatMessage({
            id: "bigdata.components.RightMenu.VersionHistory.details",
          })}
        </a>
      ),
      fixed: "right",
    },
  ];
  function isJsonString(str: string) {
    try {
      if (typeof JSON.parse(str) == "object") {
        return true;
      }
    } catch (e) {}
    return false;
  }

  useEffect(() => {
    if (isJsonString(content)) {
      setSqlLanguage("json");
      return;
    }
    setSqlLanguage("mysql");
  }, [content]);

  return (
    <Drawer
      title={i18n.formatMessage({
        id: "bigdata.components.RightMenu.VersionHistory.drawer.title",
      })}
      placement="right"
      onClose={onClose}
      visible={visible}
      width={"50vw"}
    >
      <Table
        columns={columns}
        pagination={{
          responsive: true,
          showSizeChanger: true,
          size: "small",
          ...currentPagination,
          onChange: (page, pageSize) => {
            onChangeCurrentPagination({
              ...currentPagination,
              current: page,
              pageSize,
            });
            getList(page, pageSize);
          },
        }}
        dataSource={versionHistoryList.list}
        loading={doNodeHistories.loading}
        size="middle"
        scroll={{ x: 600 }}
        rowKey={(item: any) => item.uuid}
      />
      <Drawer
        title={i18n.formatMessage({
          id: "bigdata.components.RightMenu.VersionHistory.childDrawer.title",
        })}
        width={"50vw"}
        onClose={() => setVisibleQuery(false)}
        visible={visibleQuery}
      >
        <MonacoEditor
          height={"100%"}
          language={sqlLanguage}
          theme="vs-white"
          options={{
            selectOnLineNumbers: true,
            automaticLayout: true,
            wordWrap: "wordWrapColumn",
            wrappingStrategy: "simple",
            wordWrapBreakBeforeCharacters: ",",
            wordWrapBreakAfterCharacters: ",",
            disableLayerHinting: true,
            scrollBeyondLastLine: false,
            minimap: {
              enabled: true,
            },
            readOnly: true,
          }}
          value={handleContentData(content)}
        />
      </Drawer>
    </Drawer>
  );
};

export default VersionHistory;
