import { useModel } from "@@/plugin-model/useModel";
import CustomModal from "@/components/CustomModal";
import { Button, Table } from "antd";
import { useEffect } from "react";
import { FIRST_PAGE, PAGE_SIZE } from "@/config/config";
import moment from "moment";
import { useDebounceFn } from "ahooks";

const ModalHistory = () => {
  const {
    visibleHistory,
    currentConfiguration,
    doGetHistoryConfiguration,
    onChangeVisibleHistory,
    onChangeVisibleHistoryDiff,
    doDiffHistoryConfiguration,
  } = useModel("configure");

  const doGetDiff = useDebounceFn(
    (historyId: number) => {
      doDiffHistoryConfiguration
        .run(currentConfiguration?.id as number, historyId)
        .then((res) => {
          if (res?.code === 0) {
            onChangeVisibleHistoryDiff(true);
          }
        });
    },
    { wait: 500 }
  );

  const pagination = doGetHistoryConfiguration.pagination;

  useEffect(() => {
    if (visibleHistory && currentConfiguration) {
      doGetHistoryConfiguration.run(currentConfiguration.id, {
        current: FIRST_PAGE,
        pageSize: PAGE_SIZE,
      });
    }
  }, [visibleHistory, currentConfiguration]);
  return (
    <CustomModal
      title={"提交历史"}
      width={900}
      visible={visibleHistory}
      maskClosable={false}
      onCancel={() => onChangeVisibleHistory(false)}
    >
      <Table
        bordered
        rowKey={"id"}
        size={"small"}
        loading={doGetHistoryConfiguration.loading}
        dataSource={doGetHistoryConfiguration.data}
        pagination={{
          ...pagination,
          hideOnSinglePage: true,
          onChange: (page, pageSize) => {
            if (currentConfiguration) {
              doGetHistoryConfiguration.run(currentConfiguration.id, {
                current: page,
                pageSize,
              });
            }
          },
        }}
        columns={[
          {
            title: "操作用户",
            dataIndex: "username",
            width: 120,
            align: "center",
          },
          { title: "变更记录", dataIndex: "changeLog", align: "center" },
          { title: "版本号", dataIndex: "version", align: "center" },
          {
            title: "提交时间",
            dataIndex: "ctime",
            align: "center",
            render: (ts) => moment(ts, "X").format("YYYY-MM-DD HH:mm:ss"),
          },
          {
            title: "操作",
            align: "center",
            render: (_, record) => (
              <Button
                size={"small"}
                onClick={() => {
                  doGetDiff.run(record.id);
                }}
              >
                查看变更
              </Button>
            ),
          },
        ]}
      />
    </CustomModal>
  );
};
export default ModalHistory;
