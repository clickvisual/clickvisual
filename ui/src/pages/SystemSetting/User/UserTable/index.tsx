import { RedoOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Space, Table, Tooltip } from "antd";
import { useIntl, useModel } from "umi";
import { userListType } from "..";

const UserTable = (props: {
  dataObj: { list: userListType[]; total: number };
  loadList: (currentPageInfo: { current?: number; pageSize?: number }) => void;
  setCurrentPagination: (data: { current: number; pageSize: number }) => void;
  currentPagination: { current: number; pageSize: number };
  copyInformation: (res: any, title: string) => void;
}) => {
  const i18n = useIntl();
  const {
    dataObj,
    loadList,
    currentPagination,
    setCurrentPagination,
    copyInformation,
  } = props;

  const { sysUser } = useModel("system");
  const { doResetUserPassword } = sysUser;

  const confirm = (id: number) => {
    doResetUserPassword.run(id).then((res: any) => {
      if (res.code != 0) return;
      copyInformation(res, i18n.formatMessage({ id: "sys.user.resetSuccess" }));
    });
  };

  const column: any = [
    { key: "uid", title: "Uid", dataIndex: "uid" },
    { key: "username", title: "UserName", dataIndex: "username" },
    { key: "nickname", title: "NickName", dataIndex: "nickname" },
    { key: "email", title: "Email", dataIndex: "email" },
    {
      title: "Options",
      key: "options",
      render: (_: any, record: userListType) => (
        <Space>
          <Tooltip
            title={i18n.formatMessage({ id: "sys.user.resetPassword" })}
            placement="bottom"
          >
            <Popconfirm
              title={i18n.formatMessage(
                { id: "sys.user.resetTip" },
                { user: record.nickname }
              )}
              onConfirm={() => confirm(record.uid)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                size={"small"}
                type={"link"}
                icon={<RedoOutlined />}
                onClick={() => {}}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={dataObj?.list || []}
      columns={column}
      rowKey={(item: any) => item.uid}
      pagination={{
        responsive: true,
        showSizeChanger: true,
        size: "small",
        ...currentPagination,
        total: dataObj?.total || 0,
        onChange: (page, pageSize) => {
          setCurrentPagination({
            ...currentPagination,
            current: page,
            pageSize,
          });
          loadList({
            current: page,
            pageSize,
          });
        },
      }}
    />
  );
};
export default UserTable;
