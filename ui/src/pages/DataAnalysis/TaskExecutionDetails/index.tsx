import {
  EnumsTertiary,
  getTaskListType,
  TaskListTertiaryEnum,
} from "@/services/statisticalBoard";
import { Table, Tag, Tooltip } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";
import { useIntl, useModel } from "umi";
import { getTime } from "../components/RightMenu/Results";
import TaskFilter from "./TaskFilter";

export enum StatusType {
  unknown = 0,
  success = 1,
  error = 2,
}

const TaskExecutionDetails = () => {
  const i18n = useIntl();
  const { statisticalBoard, currentInstances } = useModel("dataAnalysis");
  const { doGetTaskList } = statisticalBoard;
  const [taskList, setTaskList] = useState<any[]>([]);
  const [endTime, setEndTime] = useState<number>();
  const [startTime, setStartTime] = useState<number>();
  const [nodeName, setNodeName] = useState<string>();
  const [tertiary, setTertiary] = useState<TaskListTertiaryEnum | undefined>();
  const [state, setState] = useState<StatusType | undefined>();
  const [currentPagination, setCurrentPagination] = useState<API.Pagination>({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const getList = (data: getTaskListType) => {
    doGetTaskList.run(data).then((res: any) => {
      if (res.code != 0) return;
      setTaskList(res.data.list);
      setCurrentPagination({
        current: data.current || 1,
        pageSize: data.pageSize || 10,
        total: res.data.total,
      });
    });
  };

  const handleGetList = (data: {
    end?: number;
    start?: number;
    nodeName?: string;
    tertiary?: number;
    state?: number;
  }) =>
    currentInstances &&
    getList({
      iid: currentInstances,
      end: data.end == 0 ? undefined : data.end || endTime,
      start: data.start == 0 ? undefined : data.start || endTime,
      nodeName: data.nodeName || nodeName,
      status: data.state ?? state,
      tertiary:
        data.tertiary === undefined ? undefined : data.tertiary || tertiary,
      ...currentPagination,
    });

  const stateTag = {
    [StatusType.unknown]: <Tag>unknown</Tag>,
    [StatusType.success]: (
      <Tag color="lime">
        {i18n.formatMessage({
          id: "bigdata.dataAnalysis.taskExecutionDetails.column.status.successful",
        })}
      </Tag>
    ),
    [StatusType.error]: (
      <Tag color="red">
        {i18n.formatMessage({
          id: "bigdata.dataAnalysis.taskExecutionDetails.column.status.failure",
        })}
      </Tag>
    ),
  };

  const column: any = [
    {
      title: i18n.formatMessage({ id: "name" }),
      dataIndex: "nodeName",
      align: "center",
      render: (nodeName: string, item: any) => {
        return (
          <Tooltip title={item.nodeId}>
            <a
              href={`${process.env.PUBLIC_PATH}bigdata?iid=${item.iid}&navKey=offline&nodeId=${item.nodeId}`}
              target="_blank"
              rel="noopener"
            >
              {nodeName}
            </a>
          </Tooltip>
        );
      },
    },
    {
      title: i18n.formatMessage({
        id: "bigdata.dataAnalysis.taskExecutionDetails.column.status.name",
      }),
      dataIndex: "status",
      align: "center",
      render: (status: number) => {
        return <Tooltip title={status}>{stateTag[status]}</Tooltip>;
      },
    },
    {
      title: i18n.formatMessage({
        id: "bigdata.dataAnalysis.taskExecutionDetails.column.tertiary.name",
      }),
      dataIndex: "tertiary",
      align: "center",
      render: (tertiary: number) => {
        return <Tooltip title={tertiary}>{EnumsTertiary[tertiary]}</Tooltip>;
      },
    },
    {
      title: i18n.formatMessage({
        id: "bigdata.dataAnalysis.taskExecutionDetails.column.crontab.name",
      }),
      dataIndex: "crontab",
      align: "center",
    },
    {
      title: i18n.formatMessage({
        id: "bigdata.dataAnalysis.taskExecutionDetails.column.cost.name",
      }),
      dataIndex: "cost",
      align: "center",
      render: (cost: number) => {
        return (
          <Tooltip title={cost ? cost + "ms" : "unknown"}>
            {cost ? getTime(cost) : "unknown"}
          </Tooltip>
        );
      },
    },
    {
      title: i18n.formatMessage({
        id: "bigdata.dataAnalysis.taskExecutionDetails.column.startTime.name",
      }),
      dataIndex: "startTime",
      align: "center",
      render: (time: number) => {
        return (
          <Tooltip title={time}>
            {moment(time * 1000).format("YYYY-MM-DD HH:mm:ss")}
          </Tooltip>
        );
      },
    },
    {
      title: i18n.formatMessage({
        id: "bigdata.dataAnalysis.taskExecutionDetails.column.endTime.name",
      }),
      dataIndex: "endTime",
      align: "center",
      render: (time: number) => {
        return (
          <Tooltip title={time}>
            {moment(time * 1000).format("YYYY-MM-DD HH:mm:ss")}
          </Tooltip>
        );
      },
    },
  ];

  useEffect(() => {
    if (currentInstances) {
      setEndTime(undefined);
      setStartTime(undefined);
      setNodeName("");
      setTertiary(undefined);
      getList({ current: 1, pageSize: 10, iid: currentInstances });
    }
  }, [currentInstances]);

  return (
    <div style={{ height: "calc(100vh - 105px)" }}>
      <div
        style={{
          height: "50px",
          marginLeft: "300px",
          borderLeft: "1px solid hsla(0, 0%, 0%, 0.1)",
        }}
      >
        <TaskFilter
          onGetList={handleGetList}
          setNodeName={setNodeName}
          setEndTime={setEndTime}
          setStartTime={setStartTime}
          setTertiary={setTertiary}
          setState={setState}
          state={state}
          tertiary={tertiary}
          nodeName={nodeName}
          endTime={endTime}
          startTime={startTime}
        />
      </div>
      <div style={{ padding: "30px" }}>
        <Table
          rowKey={"id"}
          columns={column}
          loading={doGetTaskList.loading}
          dataSource={taskList}
          bordered
          scroll={{ y: "calc(100vh - 300px)" }}
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
              currentInstances &&
                getList({
                  iid: currentInstances,
                  current: page,
                  pageSize,
                });
            },
          }}
        />
      </div>
    </div>
  );
};
export default TaskExecutionDetails;
