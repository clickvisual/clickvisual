import { useModel } from "@@/plugin-model/useModel";
import CustomModal from "@/components/CustomModal";
import { Button, Table } from "antd";
import { useEffect } from "react";
import { DEBOUNCE_WAIT, FIRST_PAGE, PAGE_SIZE } from "@/config/config";
import moment from "moment";
import { useDebounceFn } from "ahooks";
import { useIntl } from "umi";
import { DiffOutlined } from "@ant-design/icons";

const ModalHistory = () => {
  const {
    visibleHistory,
    currentConfiguration,
    doGetHistoryConfiguration,
    onChangeVisibleHistory,
    onChangeVisibleHistoryDiff,
    doDiffHistoryConfiguration,
  } = useModel("configure");

  const i18n = useIntl();

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
    { wait: DEBOUNCE_WAIT }
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
      title={i18n.formatMessage({ id: "config.files.history" })}
      width={900}
      visible={visibleHistory}
      maskClosable={false}
      onCancel={() => onChangeVisibleHistory(false)}
    >
      <Table
        bordered
        rowKey={"id"}
        size={"small"}
        scroll={{ x: "max-content" }}
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
            title: i18n.formatMessage({ id: "config.history.table.user" }),
            dataIndex: "username",
            width: 120,
            align: "center",
          },
          {
            title: i18n.formatMessage({
              id: "config.history.table.changeLog",
            }),
            dataIndex: "changeLog",
            align: "center",
          },
          {
            title: i18n.formatMessage({
              id: "config.history.table.version",
            }),
            dataIndex: "version",
            align: "center",
          },
          {
            title: i18n.formatMessage({
              id: "config.history.table.submitTime",
            }),
            dataIndex: "ctime",
            align: "center",
            render: (ts) => moment(ts, "X").format("YYYY-MM-DD HH:mm:ss"),
          },
          {
            title: i18n.formatMessage({ id: "operation" }),
            align: "center",
            fixed: "right",
            render: (_, record) => (
              <Button
                loading={doDiffHistoryConfiguration.loading}
                size={"small"}
                icon={<DiffOutlined />}
                onClick={() => {
                  doGetDiff.run(record.id);
                }}
              >
                {i18n.formatMessage({
                  id: "config.history.table.button.viewChanges",
                })}
              </Button>
            ),
          },
        ]}
      />
    </CustomModal>
  );
};
export default ModalHistory;
