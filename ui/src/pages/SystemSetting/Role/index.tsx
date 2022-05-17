import { useEffect, useRef, useState } from "react";
import {
  Button,
  Divider,
  Form,
  Input,
  message,
  Modal,
  Select,
  Tag,
  Tooltip,
} from "antd";
import {
  CheckRoot,
  // reqCreatePmsDefaultRole,
  reqDeleteRole,
  reqGetRoleList,
  // reqGrantRootUids,
} from "@/services/pms";
import useRequest from "@/hooks/useRequest/useRequest";
import { useModel } from "@@/plugin-model/useModel";
import {
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import ItemForm from "@/pages/SystemSetting/Role/components/ItemForm";
import RootUserForm from "@/pages/SystemSetting/Role/components/RootUserForm";
import RoleModel from "@/pages/SystemSetting/Role/components/RoleModel";
import SearchTable, {
  SearchTableInstance,
} from "@/pages/SystemSetting/Role/components/SearchTable";
import RoleStyle from "@/pages/SystemSetting/Role/styles/index.less";
import role from "@/pages/SystemSetting/Role/hooks/role";
import { useIntl } from "umi";

function PmsDefaultRoles() {
  const i18n = useIntl();
  const actionRef = useRef<SearchTableInstance>();
  const { commonInfo, fetchPmsCommonInfo } = useModel("pms");
  const { onChangeRoleModal, doGetPmsRole } = useModel("pms");
  const [load, setLoad] = useState<any>();
  const [createModalVisible, handleCreateModalVisible] =
    useState<boolean>(false);
  const [grantRootUserVisible, handleGrantRootUserVisible] =
    useState<boolean>(false);
  const [form] = Form.useForm();
  const { handleCreate, handleGrantUsers } = role();
  const deleteRole = useRequest(reqDeleteRole, {
    loadingText: {
      loading: undefined,
      done: i18n.formatMessage({
        id: "systemSetting.role.delete.success",
      }),
    },
    onSuccess: (res) => actionRef.current?.refresh(),
  });
  const callBackRefresh = () => {
    actionRef.current?.refresh();
  };

  const editorRole = (roleId: number) => {
    doGetPmsRole(roleId).then((res) => {
      load;
      if (res?.code === 0)
        onChangeRoleModal(true, 1, "global", callBackRefresh);
    });
  };

  const doDeleteRole = (roleId: number) => {
    deleteRole.run(roleId);
  };

  const deleteRoleConfirm = (record: any) => {
    Modal.confirm({
      title: i18n.formatMessage({
        id: "systemSetting.role.delete.title",
      }),
      content: i18n.formatMessage(
        {
          id: "systemSetting.role.delete.content",
        },
        { name: record.name }
      ),
      icon: <ExclamationCircleOutlined style={{ color: "red" }} />,
      onOk: () => doDeleteRole(record.id),
      okButtonProps: { danger: true },
      okText: i18n.formatMessage({
        id: "systemSetting.role.okTest",
      }),
      cancelText: i18n.formatMessage({
        id: "systemSetting.role.cancelText",
      }),
    });
  };

  useEffect(() => {
    fetchPmsCommonInfo(0);
  }, []);

  const columns = [
    {
      title: i18n.formatMessage({
        id: "systemSetting.role.table.name",
      }),
      dataIndex: "name",
      key: "name",
      width: 60,
    },
    {
      title: i18n.formatMessage({
        id: "systemSetting.role.table.desc",
      }),
      dataIndex: "desc",
      key: "desc",
      width: 200,
    },
    {
      title: i18n.formatMessage({
        id: "systemSetting.role.table.belongResource",
      }),
      dataIndex: "belongResource",
      key: "belongResource",
      width: 200,
    },
    {
      title: i18n.formatMessage({
        id: "systemSetting.role.table.subResources",
      }),
      dataIndex: "details",
      key: "subResources",
      width: 100,
      render: (details: any, _: any) => (
        <div style={{ display: "flex" }}>
          {details?.map((subResources: any) => {
            return (
              <>
                {subResources.subResources.map((item: string) => {
                  return <Tag color="#108ee9">{item}</Tag>;
                })}
              </>
            );
          })}
        </div>
      ),
    },
    {
      title: i18n.formatMessage({
        id: "systemSetting.role.table.acts",
      }),
      dataIndex: "acts",
      key: "acts",
      width: 100,
      render: (details: any, _: any) => (
        <div style={{ display: "flex" }}>
          {details?.map((acts: any) => {
            return (
              <>
                {acts.acts.map((item: any) => {
                  return <Tag color="#87d068">{item}</Tag>;
                })}
              </>
            );
          })}
        </div>
      ),
    },
    {
      title: i18n.formatMessage({
        id: "systemSetting.role.table.option",
      }),
      key: "operating",
      valueType: "option",
      width: 80,
      fixed: "right" as "right",
      render: (_: any, record: any) => {
        return (
          <>
            <Tooltip
              title={i18n.formatMessage({
                id: "systemSetting.role.table.option.edit",
              })}
            >
              <EditOutlined
                onClick={() => {
                  CheckRoot().then((r) => {
                    setLoad(
                      message.loading(
                        i18n.formatMessage({
                          id: "models.pms.loading",
                        }),
                        0
                      )
                    );
                    if (r.code !== 0) {
                      message.error(r.msg);
                      return;
                    }
                    editorRole(record.id);
                  });
                }}
              />
            </Tooltip>
            <Divider type="vertical" />
            <Tooltip
              title={i18n.formatMessage({
                id: "systemSetting.role.table.option.delete",
              })}
            >
              <DeleteOutlined
                onClick={() => {
                  CheckRoot().then((r) => {
                    if (r.code !== 0) {
                      message.error(r.msg);
                      return;
                    }
                    deleteRoleConfirm(record);
                  });
                }}
              />
            </Tooltip>
          </>
        );
      },
    },
  ];
  return (
    <div className={RoleStyle.roleMain}>
      <SearchTable
        pagination={false}
        ref={actionRef}
        request={(params) => {
          const name = params.name || "";
          const belongResource = params.belongResource || "";
          return reqGetRoleList(name, belongResource).then((r) => {
            if (r.code !== 0) {
              message.error(`${r.msg}`);
              return [];
            }
            return r;
          });
        }}
        columns={columns}
        form={form}
        rowKey={(record: any) => record.id}
        formContent={(search, form) => {
          return (
            <div>
              <Form
                form={form}
                onFinish={(fields) => search(fields)}
                layout="inline"
              >
                <Form.Item
                  label={i18n.formatMessage({
                    id: "systemSetting.role.filtrate.label.belongResource",
                  })}
                  name="belongResource"
                >
                  <Select
                    showSearch
                    optionFilterProp="children"
                    style={{ width: 200 }}
                  >
                    {(commonInfo?.prefixes_info || []).map((item, index) => {
                      return (
                        <Select.Option key={index} value={item.name}>
                          {item.name} | {item.desc}
                        </Select.Option>
                      );
                    })}
                  </Select>
                </Form.Item>
                <Form.Item
                  label={i18n.formatMessage({
                    id: "systemSetting.role.filtrate.label.name",
                  })}
                  name="name"
                >
                  <Input style={{ width: 200 }} />
                </Form.Item>
                <Form.Item>
                  <Button htmlType="submit" type={"primary"}>
                    <SearchOutlined />
                    {i18n.formatMessage({
                      id: "systemSetting.role.filtrate.label.query",
                    })}
                  </Button>
                </Form.Item>
                <Form.Item>
                  <Button
                    onClick={() => {
                      actionRef.current?.form.resetFields();
                      actionRef.current?.form.submit();
                    }}
                  >
                    <ClearOutlined />
                    {i18n.formatMessage({
                      id: "systemSetting.role.filtrate.clear",
                    })}
                  </Button>
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    onClick={() => {
                      CheckRoot().then((r) => {
                        if (r.code !== 0) {
                          message.error(r.msg);
                          return;
                        }
                        onChangeRoleModal(true, 1, "global", callBackRefresh);
                      });
                    }}
                  >
                    <PlusOutlined />{" "}
                    {i18n.formatMessage({
                      id: "systemSetting.role.filtrate.create",
                    })}
                  </Button>
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    onClick={() => {
                      CheckRoot().then((r) => {
                        if (r.code !== 0) {
                          message.error(r.msg);
                          return;
                        }
                        handleGrantRootUserVisible(true);
                      });
                    }}
                  >
                    <PlusOutlined />
                    {i18n.formatMessage({
                      id: "systemSetting.role.filtrate.rootAuthority",
                    })}
                  </Button>
                </Form.Item>
              </Form>
            </div>
          );
        }}
      />
      <ItemForm
        formTitle={i18n.formatMessage({
          id: "systemSetting.role.filtrate.createDefaultRole",
        })}
        onSubmit={async (value: any) => {
          const success = handleCreate(value);
          if (await success) {
            handleCreateModalVisible(false);
            if (actionRef.current) {
              actionRef.current.refresh();
            }
          }
        }}
        onCancel={() => handleCreateModalVisible(false)}
        modalVisible={createModalVisible}
      />
      <RootUserForm
        formTitle={i18n.formatMessage({
          id: "systemSetting.role.filtrate.superAdministratorAuthorization",
        })}
        onSubmit={async (value: any) => {
          const success = handleGrantUsers(value);
          if (await success) {
            handleGrantRootUserVisible(false);
            if (actionRef.current) {
              actionRef.current.refresh();
              location.reload();
            }
          }
        }}
        onCancel={() => handleGrantRootUserVisible(false)}
        modalVisible={grantRootUserVisible}
      />
      <RoleModel />
    </div>
  );
}

export default PmsDefaultRoles;
