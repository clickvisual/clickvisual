import { Drawer, Table, Tooltip } from "antd";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { useModel } from "umi";
import MonacoEditor from "react-monaco-editor";
import { format } from "sql-formatter";

const VersionHistory = (props: {
  visible: boolean;
  setVisible: (flag: boolean) => void;
}) => {
  const { visible, setVisible } = props;

  const [visibleQuery, setVisibleQuery] = useState<boolean>(false);
  const [content, setContent] = useState<string>("");
  const [sqlLanguage, setSqlLanguage] = useState<string>("mysql");

  const {
    openNodeId,
    doNodeHistories,
    doNodeHistoriesInfo,
    changeVersionHistoryList,
    versionHistoryList,
    currentPagination,
    setCurrentPagination,
  } = useModel("dataAnalysis");

  const getList = (page: number, pageSize: number) => {
    openNodeId &&
      doNodeHistories
        .run(openNodeId as number, {
          current: page,
          pageSize,
        })
        .then((res: any) => {
          if (res.code == 0) {
            changeVersionHistoryList(res.data);
            setCurrentPagination({
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
      changeVersionHistoryList({ list: [], total: 0 });
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
      title: "版本",
      dataIndex: "uuid",
      key: "uuid",
      ellipsis: { showTitle: true },
      render: (_: any, record: any) => (
        <Tooltip title={record.uuid}>{record.uuid}</Tooltip>
      ),
    },
    {
      title: "提交人",
      dataIndex: "userName",
      key: "userName",
      render: (_: any, record: any) => (
        <Tooltip title={record.uid}>{record.userName}</Tooltip>
      ),
    },
    {
      title: "提交时间",
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
      title: "操作",
      dataIndex: "operation",
      key: "operation",
      width: 100,
      render: (_: any, record: any) => (
        <a
          onClick={() => {
            doNodeHistoriesInfo
              .run(openNodeId as number, record.uuid)
              .then((res: any) => {
                if (res.code == 0) {
                  setContent(res.data.content);
                  setVisibleQuery(true);
                }
              });
          }}
        >
          详情
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
      title="版本历史"
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
            setCurrentPagination({
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
        title="查询语句"
        width={"50vw"}
        // closable={false}
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
