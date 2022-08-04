import { ClockCircleOutlined } from "@ant-design/icons";
import { Drawer, Table, Tooltip } from "antd";
import moment from "moment";
import { useEffect } from "react";
import { useModel, useIntl } from "umi";
import ResultsItem from "./ResultsItem";

const VersionHistory = (props: {
  visible: boolean;
  setVisible: (flag: boolean) => void;
  resultsList: any;
  currentResultsPagination: any;
  visibleResultsItem: any;
  setVisibleResultsItem: any;
  onChangeResultsList: (arr: any) => void;
  onChangeCurrentResultsPagination: (val: any) => void;
  onChangeCurrentPagination: (val: any) => void;
}) => {
  const {
    visible,
    setVisible,
    resultsList,
    currentResultsPagination,
    visibleResultsItem,
    setVisibleResultsItem,
    onChangeResultsList,
    onChangeCurrentResultsPagination,
    onChangeCurrentPagination,
  } = props;
  const i18n = useIntl();

  const { openNodeId, doResultsList, changeResultId } =
    useModel("dataAnalysis");

  const getList = (page: number, pageSize: number) => {
    openNodeId &&
      doResultsList
        .run(openNodeId as number, {
          current: page,
          pageSize,
          isExcludeCrontabResult: 0,
        })
        .then((res: any) => {
          if (res.code == 0) {
            onChangeResultsList(res.data);
            onChangeCurrentResultsPagination({
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
      onChangeResultsList({ list: [], total: 0 });
    }
  }, [visible]);

  const onClose = () => {
    setVisible(false);
  };

  const columns: any = [
    {
      title: "id",
      dataIndex: "id",
      key: "id",
      ellipsis: { showTitle: true },
      render: (_: any, record: any) => (
        <Tooltip title={record.id}>{record.id}</Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({
        id: "bigdata.components.RightMenu.VersionHistory.submitter",
      }),
      dataIndex: "nickname",
      key: "nickname",
      render: (_: any, record: any) => (
        <>
          {record.uid == -1 ? (
            <Tooltip
              title={i18n.formatMessage({
                id: "bigdata.components.RightMenu.results.timingTask",
              })}
            >
              <ClockCircleOutlined style={{ color: "#2FABEE" }} />
            </Tooltip>
          ) : (
            <Tooltip title={"uid: " + record.uid}>{record.nickname}</Tooltip>
          )}
        </>
      ),
    },
    {
      title: i18n.formatMessage({
        id: "bigdata.components.RightMenu.results.executionTime",
      }),
      dataIndex: "ctime",
      key: "ctime",
      ellipsis: { showTitle: true },
      render: (_: any, record: any) => (
        <Tooltip
          title={moment(record.ctime, "X").format("YYYY-MM-DD HH:mm:ss")}
        >
          {moment(record.ctime, "X").format("MM-DD HH:mm:ss")}
        </Tooltip>
      ),
    },
    {
      title: i18n.formatMessage({
        id: "bigdata.components.RightMenu.results.ExecutionDuration",
      }),
      dataIndex: "cost",
      key: "cost",
      ellipsis: { showTitle: true },
      render: (_: any, record: any) => (
        <Tooltip title={record.cost ? record.cost + "ms" : "unknown"}>
          {record.cost ? record.cost + "ms" : "unknown"}
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
            setVisibleResultsItem(true);
            record.id && changeResultId(record.id);
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

  return (
    <Drawer
      title={i18n.formatMessage({
        id: "bigdata.components.RightMenu.results.title",
      })}
      placement="right"
      onClose={onClose}
      visible={visible}
      width={"50vw"}
      style={{ transform: "none" }}
    >
      <Table
        columns={columns}
        pagination={{
          responsive: true,
          showSizeChanger: true,
          size: "small",
          ...currentResultsPagination,
          onChange: (page, pageSize) => {
            onChangeCurrentPagination({
              ...currentResultsPagination,
              current: page,
              pageSize,
            });
            getList(page, pageSize);
          },
        }}
        dataSource={resultsList.list}
        loading={doResultsList.loading}
        size="middle"
        scroll={{ x: 600 }}
        rowKey={(item: any) => item.id}
      />
      <ResultsItem
        visible={visibleResultsItem}
        setVisible={setVisibleResultsItem}
        nodeId={openNodeId}
      />
    </Drawer>
  );
};

export default VersionHistory;
