import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
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
  reqCreatePmsDefaultRole,
  reqDeleteRole,
  reqGetRoleList,
  reqGrantRootUids,
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
import ItemForm from "./components/ItemForm";
import RootUserForm from "./components/RootUserForm";
import RoleModel from "./components/RoleModel";
import { SearchTableInstance } from "./components/SearchTable";
import SearchTable from "./components/SearchTable";

const handleCreate = async (values: any) => {
  const hide = message.loading("正在添加");
  try {
    const resp = await reqCreatePmsDefaultRole({ ...values });
    if (resp.code !== 0) {
      hide();
      message.error(`角色创建失败. ${resp.msg}`);
      return true;
    }
    hide();
    message.success("角色创建成功");
    return true;
  } catch (error) {
    hide();
    message.error("角色创建失败请重试！");
    return false;
  }
};

const handleGrantUsers = async (values: any) => {
  const hide = message.loading("正在授权...");
  try {
    const resp = await reqGrantRootUids({ ...values });
    if (resp.code !== 0) {
      hide();
      message.error(`授权失败. ${resp.msg}`);
      return true;
    }
    hide();
    message.success("授权成功");
    return true;
  } catch (error) {
    hide();
    message.error("授权失败请重试！");
    return false;
  }
};

function PmsDefaultRoles() {
  const actionRef = useRef<SearchTableInstance>();
  const { commonInfo, fetchPmsCommonInfo } = useModel("pms");
  const { onChangeRoleModal, doGetPmsRole } = useModel("pms");
  const [createModalVisible, handleCreateModalVisible] =
    useState<boolean>(false);
  const [grantRootUserVisible, handleGrantRootUserVisible] =
    useState<boolean>(false);
  const [form] = Form.useForm();
  const deleteRole = useRequest(reqDeleteRole, {
    loadingText: { loading: undefined, done: "删除成功" },
    onSuccess: (res) => actionRef.current?.refresh(),
  });
  const callBackRefresh = () => {
    actionRef.current?.refresh();
  };

  const editorRole = (roleId: number) => {
    doGetPmsRole(roleId).then((res) => {
      if (res?.code === 0)
        onChangeRoleModal(true, 1, "global", callBackRefresh);
    });
  };

  const doDeleteRole = (roleId: number) => {
    deleteRole.run(roleId);
  };

  const deleteRoleConfirm = (record: any) => {
    Modal.confirm({
      title: "删除操作",
      content: `您确定要删除角色：${record.name}吗？`,
      icon: <ExclamationCircleOutlined style={{ color: "red" }} />,
      onOk: () => doDeleteRole(record.id),
      okButtonProps: { danger: true },
      okText: "确定",
      cancelText: "取消",
    });
  };

  useEffect(() => {
    fetchPmsCommonInfo(0);
  }, []);

  const columns = [
    {
      title: "角色名",
      dataIndex: "name",
      key: "name",
      width: 60,
    },
    {
      title: "角色描述",
      dataIndex: "desc",
      key: "desc",
      width: 200,
    },
    {
      title: "所属资源",
      dataIndex: "belongResource",
      key: "belongResource",
      width: 200,
    },
    {
      title: "子资源",
      dataIndex: "details",
      key: "subResources",
      width: 100,
      render: (details, _) => (
        <div style={{ display: "flex" }}>
          {details?.map((subResources) => {
            return (
              <>
                {subResources.subResources.map((item) => {
                  return <Tag color="#108ee9">{item}</Tag>;
                })}
              </>
            );
          })}
        </div>
      ),
    },
    {
      title: "准许",
      dataIndex: "details",
      key: "acts",
      width: 100,
      render: (details, _) => (
        <div style={{ display: "flex" }}>
          {details?.map((acts) => {
            return (
              <>
                {acts.acts.map((item) => {
                  return <Tag color="#87d068">{item}</Tag>;
                })}
              </>
            );
          })}
        </div>
      ),
    },
    {
      title: "操作",
      key: "operating",
      valueType: "option",
      width: 80,
      fixed: "right" as "right",
      render: (_: any, record: any) => {
        return (
          <>
            <Tooltip title={"编辑"}>
              <EditOutlined
                onClick={() => {
                  CheckRoot().then((r) => {
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
            <Tooltip title={"删除"}>
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
    <div>
      <Card>
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
                  <Form.Item label="所属资源" name="belongResource">
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
                  <Form.Item label="角色名" name="name">
                    <Input style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item>
                    <Button htmlType="submit" type={"primary"}>
                      <SearchOutlined />
                      查询
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
                      清空条件
                    </Button>
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      onClick={() => {
                        // handleCreateModalVisible(true);
                        CheckRoot().then((r) => {
                          if (r.code !== 0) {
                            message.error(r.msg);
                            return;
                          }
                          onChangeRoleModal(true, 1, "global", callBackRefresh);
                        });
                      }}
                    >
                      <PlusOutlined /> 新建
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
                      <PlusOutlined /> root授权
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            );
          }}
        />
      </Card>
      <ItemForm
        formTitle={"创建默认角色"}
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
        formTitle={"超级管理员授权"}
        onSubmit={async (value: any) => {
          const success = handleGrantUsers(value);
          if (await success) {
            handleGrantRootUserVisible(false);
            if (actionRef.current) {
              actionRef.current.refresh();
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
