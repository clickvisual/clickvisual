import viewDrawStyles from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/DatabaseViewsDraw/index.less";
import { Button, Divider, Drawer, Space, Table, Tooltip } from "antd";
import classNames from "classnames";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useIntl } from "umi";
import { AlignType } from "rc-table/lib/interface";
import IconFont from "@/components/IconFont";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import ModalCreatedAndUpdatedView from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList/DatabaseViewsDraw/ModalCreatedAndUpdatedView";
import DeletedModal from "@/components/DeletedModal";
import { TablesResponse, ViewResponse } from "@/services/dataLogs";

type DatabaseViewsDrawProps = {
  logLibrary: TablesResponse;
};

const DatabaseViewsDraw = (props: DatabaseViewsDrawProps) => {
  const { logLibrary } = props;
  const {
    viewsVisibleDraw,
    getViewList,
    viewList,
    doGetViewInfo,
    deletedView,
    onChangeViewsVisibleDraw,
    onChangeViewIsEdit,
    onChangeViewVisibleModal,
  } = useModel("dataLogs");
  const i18n = useIntl();

  const doGetViews = () => {
    getViewList.run(logLibrary.id);
  };

  const doEdit = (id: number) => {
    doGetViewInfo.run(id).then((res) => {
      if (res?.code === 0) {
        onChangeViewIsEdit(true);
        onChangeViewVisibleModal(true);
      }
    });
  };

  const doDelete = (record: ViewResponse) => {
    DeletedModal({
      onOk: () => {
        deletedView.run(record.id).then((res) => {
          if (res?.code === 0) {
            doGetViews();
          }
        });
      },
      content: i18n.formatMessage(
        {
          id: "datasource.logLibrary.views.deleted.content",
        },
        { rule: record.viewName }
      ),
    });
  };
  const column = [
    {
      title: i18n.formatMessage({ id: "datasource.view.table.viewName" }),
      dataIndex: "viewName",
      width: "70%",
      align: "center" as AlignType,
      ellipsis: { showTitle: false },
    },
    {
      title: i18n.formatMessage({ id: "operation" }),
      dataIndex: "operation",
      width: "30%",
      align: "center" as AlignType,
      render: (_: any, record: any) => (
        <Space>
          <Button onClick={() => doEdit(record.id)} type={"link"}>
            <Tooltip title={i18n.formatMessage({ id: "edit" })}>
              <EditOutlined />
            </Tooltip>
          </Button>
          <Divider type="vertical" />
          <Tooltip title={i18n.formatMessage({ id: "delete" })}>
            <IconFont
              onClick={() => doDelete(record)}
              className={viewDrawStyles.buttonIcon}
              type={"icon-delete"}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    if (viewsVisibleDraw) doGetViews();
  }, [viewsVisibleDraw]);
  return (
    <Drawer
      title={i18n.formatMessage({ id: "datasource.view.draw" })}
      placement="right"
      closable
      getContainer={false}
      width={"35vw"}
      bodyStyle={{ padding: 10 }}
      headerStyle={{ padding: 10 }}
      visible={viewsVisibleDraw}
      onClose={() => onChangeViewsVisibleDraw(false)}
    >
      <div className={classNames(viewDrawStyles.drawCreatedButton)}>
        <Button
          onClick={() => onChangeViewVisibleModal(true)}
          icon={<PlusOutlined />}
          type={"primary"}
        >
          {i18n.formatMessage({ id: "datasource.view.button" })}
        </Button>
      </div>
      <Table
        bordered
        rowKey={"id"}
        columns={column}
        size={"small"}
        dataSource={viewList}
        className={viewDrawStyles.tableWrapper}
        pagination={{ responsive: true, showSizeChanger: true, size: "small" }}
      />
      <ModalCreatedAndUpdatedView
        logLibrary={logLibrary}
        getList={doGetViews}
      />
    </Drawer>
  );
};
export default DatabaseViewsDraw;
