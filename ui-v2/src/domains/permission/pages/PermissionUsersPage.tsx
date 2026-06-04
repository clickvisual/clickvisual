import { useEffect, useMemo, useState } from "react";
import PermissionCenterLayout from "../components/PermissionCenterLayout";
import {
  createPermissionUser,
  deletePermissionUser,
  getPermissionCommonInfo,
  getPermissionInstanceGrant,
  listPermissionUsers,
  listPermissionInstances,
  resetPermissionUserPassword,
  updatePermissionUser,
  updatePermissionInstanceGrant,
  type PermissionCommonInfo,
  type PermissionInstance,
  type PermissionInstanceGrant,
  type PermissionUser
} from "../api/permission";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/state/PageState";

type FeedbackState =
  | { tone: "status" | "alert"; message: string }
  | null;

type UserModalState =
  | {
      mode: "create";
      username: string;
      nickname: string;
      email: string;
      phone: string;
    }
  | {
      mode: "edit";
      userId: number;
      username: string;
      nickname: string;
      email: string;
      phone: string;
    }
  | null;

type GrantModalState = {
  instanceId: string;
  roleId: string;
  domain: string;
};

type AggregatedGrant = {
  instanceId: number;
  instanceName: string;
  roleId: number;
  roleName: string;
  roleDesc: string;
  domain: string[];
};

function emptyCreateModal(): Extract<UserModalState, { mode: "create" }> {
  return {
    mode: "create",
    username: "",
    nickname: "",
    email: "",
    phone: ""
  };
}

export default function PermissionUsersPage() {
  const [users, setUsers] = useState<PermissionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [keyword, setKeyword] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [userModal, setUserModal] = useState<UserModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<PermissionUser | null>(null);
  const [instances, setInstances] = useState<PermissionInstance[]>([]);
  const [instanceGrants, setInstanceGrants] = useState<Record<number, PermissionInstanceGrant>>({});
  const [commonInfo, setCommonInfo] = useState<PermissionCommonInfo | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [grantModal, setGrantModal] = useState<GrantModalState | null>(null);

  async function loadUsers(nextKeyword = keyword) {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await listPermissionUsers({
        username: nextKeyword,
        current: 1,
        pageSize: 20
      });
      setUsers(response.list);
      setSelectedUserId((currentSelectedUserId) =>
        currentSelectedUserId && response.list.some((item) => item.uid === currentSelectedUserId)
          ? currentSelectedUserId
          : response.list[0]?.uid ?? null
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "用户列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers("");
  }, []);

  useEffect(() => {
    async function loadPermissionContext() {
      try {
        const [nextInstances, nextCommonInfo] = await Promise.all([
          listPermissionInstances(),
          getPermissionCommonInfo()
        ]);
        setInstances(nextInstances);
        setCommonInfo(nextCommonInfo);
        const grantEntries = await Promise.all(
          nextInstances.map(async (instance) => [
            instance.id,
            await getPermissionInstanceGrant(instance.id)
          ] as const)
        );
        setInstanceGrants(Object.fromEntries(grantEntries));
      } catch (error) {
        setFeedback({
          tone: "alert",
          message: error instanceof Error ? error.message : "权限上下文加载失败"
        });
      }
    }

    void loadPermissionContext();
  }, []);

  const selectedUser =
    users.find((item) => item.uid === selectedUserId) ?? null;

  const selectedUserGrants = selectedUser
    ? Object.values(instanceGrants).flatMap((instanceGrant) => {
        const instance = instances.find((item) => item.id === instanceGrant.iid);
        return instanceGrant.roles.flatMap((role) =>
          role.grant
            .filter((grant) => grant.userIds.includes(selectedUser.uid))
            .map(
              (grant): AggregatedGrant => ({
                instanceId: instanceGrant.iid,
                instanceName: instance?.name || `实例 #${instanceGrant.iid}`,
                roleId: role.id,
                roleName: role.name,
                roleDesc: role.desc,
                domain: grant.domain
              })
            )
        );
      })
    : [];

  const domainOptions = useMemo(() => {
    function flatten(
      items: NonNullable<PermissionCommonInfo["domainCascader"]>,
      valuePath: string[] = [],
      labelPath: string[] = []
    ): Array<{ value: string; label: string }> {
      return items.flatMap((item) => {
        const nextValuePath = valuePath.concat(item.value);
        const nextLabelPath = labelPath.concat(item.label);
        const current = {
          value: nextValuePath.join("__"),
          label: nextLabelPath.join(" / ")
        };
        return item.children && item.children.length > 0
          ? flatten(item.children, nextValuePath, nextLabelPath)
          : [current];
      });
    }

    return commonInfo?.domainCascader
      ? flatten(commonInfo.domainCascader)
      : [{ value: "*", label: "全部数据域" }];
  }, [commonInfo]);

  const availableRoles =
    grantModal && grantModal.instanceId
      ? instanceGrants[Number(grantModal.instanceId)]?.roles ?? []
      : [];

  const selectedGrantRole =
    grantModal && grantModal.roleId
      ? availableRoles.find((role) => String(role.id) === grantModal.roleId) ?? null
      : null;

  const selectedDomainOption =
    grantModal ? domainOptions.find((option) => option.value === grantModal.domain) ?? null : null;

  function upsertInstanceGrant(updatedGrant: PermissionInstanceGrant) {
    setInstanceGrants((current) => ({
      ...current,
      [updatedGrant.iid]: updatedGrant
    }));
  }

  async function handleSaveGrant() {
    if (!selectedUser || !grantModal) {
      return;
    }

    const instanceId = Number(grantModal.instanceId);
    const instanceGrant = instanceGrants[instanceId];
    if (!instanceGrant) {
      return;
    }

    const nextInstanceGrant: PermissionInstanceGrant = {
      ...instanceGrant,
      roles: instanceGrant.roles.map((role) => {
        if (String(role.id) !== grantModal.roleId) {
          return role;
        }

        const nextGrantList = role.grant.map((grant) => ({
          ...grant,
          userIds: [...grant.userIds],
          domain: [...grant.domain]
        }));
        const domainTokens =
          grantModal.domain.trim() === "*"
            ? ["*"]
            : grantModal.domain
                .split("__")
                .map((item) => item.trim())
                .filter(Boolean);
        const matchedGrant = nextGrantList.find(
          (grant) => grant.domain.join("__") === domainTokens.join("__")
        );

        if (matchedGrant) {
          if (!matchedGrant.userIds.includes(selectedUser.uid)) {
            matchedGrant.userIds.push(selectedUser.uid);
          }
        } else {
          nextGrantList.push({
            created: 0,
            domain: domainTokens,
            userIds: [selectedUser.uid]
          });
        }

        return {
          ...role,
          grant: nextGrantList
        };
      })
    };

    try {
      await updatePermissionInstanceGrant(instanceId, nextInstanceGrant);
      upsertInstanceGrant(nextInstanceGrant);
      setGrantModal(null);
      setFeedback({
        tone: "status",
        message: "授权已更新"
      });
    } catch (error) {
      setFeedback({
        tone: "alert",
        message: error instanceof Error ? error.message : "保存授权失败"
      });
    }
  }

  async function handleRemoveGrant(target: AggregatedGrant) {
    if (!selectedUser) {
      return;
    }

    const instanceGrant = instanceGrants[target.instanceId];
    if (!instanceGrant) {
      return;
    }

    const nextInstanceGrant: PermissionInstanceGrant = {
      ...instanceGrant,
      roles: instanceGrant.roles.map((role) => {
        if (role.id !== target.roleId) {
          return role;
        }

        return {
          ...role,
          grant: role.grant
            .map((grant) => ({
              ...grant,
              userIds: grant.userIds.filter((userId) => userId !== selectedUser.uid)
            }))
            .filter((grant) => grant.userIds.length > 0)
        };
      })
    };

    try {
      await updatePermissionInstanceGrant(target.instanceId, nextInstanceGrant);
      upsertInstanceGrant(nextInstanceGrant);
      setFeedback({
        tone: "status",
        message: "授权已移除"
      });
    } catch (error) {
      setFeedback({
        tone: "alert",
        message: error instanceof Error ? error.message : "移除授权失败"
      });
    }
  }

  async function handleSubmitUser() {
    if (!userModal) {
      return;
    }

    try {
      if (userModal.mode === "create") {
        const result = await createPermissionUser({
          username: userModal.username.trim(),
          nickname: userModal.nickname.trim()
        });
        setFeedback({
          tone: "status",
          message: `初始密码：${result.password}`
        });
      } else {
        await updatePermissionUser(userModal.userId, {
          nickname: userModal.nickname.trim(),
          email: userModal.email.trim(),
          phone: userModal.phone.trim()
        });
        setFeedback({
          tone: "status",
          message: "用户资料已更新"
        });
      }

      setUserModal(null);
      await loadUsers(keyword);
    } catch (error) {
      setFeedback({
        tone: "alert",
        message: error instanceof Error ? error.message : "保存用户失败"
      });
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) {
      return;
    }

    try {
      await deletePermissionUser(deleteTarget.uid);
      setFeedback({
        tone: "status",
        message: `已删除用户 ${deleteTarget.nickname}`
      });
      setDeleteTarget(null);
      await loadUsers(keyword);
    } catch (error) {
      setFeedback({
        tone: "alert",
        message: error instanceof Error ? error.message : "删除用户失败"
      });
    }
  }

  async function handleResetPassword(user: PermissionUser) {
    try {
      const result = await resetPermissionUserPassword(user.uid);
      setFeedback({
        tone: "status",
        message: `重置密码成功：${result.password}`
      });
    } catch (error) {
      setFeedback({
        tone: "alert",
        message: error instanceof Error ? error.message : "重置密码失败"
      });
    }
  }

  return (
    <PermissionCenterLayout
      title="用户与授权"
      description=""
      summary={`${users.length} 个用户`}
    >
      <div className="cv-permission-toolbar">
        <label className="cv-form-row cv-permission-search">
          <span className="cv-label">用户搜索</span>
          <input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            className="cv-input"
            placeholder="用户名 / 昵称"
          />
        </label>
        <div className="cv-permission-toolbar__meta">
          <span className="cv-permission-toolbar__count">当前结果 {users.length}</span>
          <div className="cv-header-actions cv-permission-toolbar__actions">
            <button
              type="button"
              className="cv-secondary-button"
              onClick={() => {
                setKeyword(searchDraft.trim());
                void loadUsers(searchDraft.trim());
              }}
            >
              搜索
            </button>
            <button
              type="button"
              className="cv-secondary-button"
              onClick={() => {
                setSearchDraft("");
                setKeyword("");
                void loadUsers("");
              }}
            >
              刷新
            </button>
            <button
              type="button"
              className="cv-action-button"
              onClick={() => setUserModal(emptyCreateModal())}
            >
              新增用户
            </button>
          </div>
        </div>
      </div>

      {feedback ? (
        <div className="cv-status-card" role={feedback.tone}>
          {feedback.message}
        </div>
      ) : null}

      {loading ? <LoadingState title="用户列表加载中" description="正在获取账号信息..." /> : null}
      {!loading && errorMessage ? (
        <ErrorState title="用户列表加载失败" description={errorMessage} />
      ) : null}
      {!loading && !errorMessage && users.length === 0 ? (
        <EmptyState title="暂无用户" description="可以先创建一个本地用户，后续再为其分配角色与实例权限。" />
      ) : null}
      {!loading && !errorMessage && users.length > 0 ? (
        <div className="cv-permission-grid">
          <section className="cv-permission-card cv-permission-card--list">
            <div className="cv-panel-header">
              <div>
                <h3 className="cv-panel-title cv-permission-card__title">用户列表</h3>
                <p className="cv-muted">创建、编辑、重置密码</p>
              </div>
            </div>
            <div className="cv-table-wrap">
              <table className="cv-table cv-permission-table">
                <thead>
                  <tr>
                    <th>登录名</th>
                    <th>显示名</th>
                    <th>联系信息</th>
                    <th>授权</th>
                    <th style={{ textAlign: "right" }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.uid}
                      className={user.uid === selectedUserId ? "cv-permission-user-row--active" : ""}
                    >
                      <td>{user.username}</td>
                      <td>{user.nickname}</td>
                      <td>
                        <div className="cv-permission-inline-meta">
                          <span>{user.email || "-"}</span>
                          <span>{user.phone || "-"}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="cv-link-button"
                          onClick={() => setSelectedUserId(user.uid)}
                        >
                          查看授权
                        </button>
                      </td>
                      <td>
                        <div className="cv-settings-table-actions cv-permission-actions-compact">
                          <button
                            type="button"
                            className="cv-secondary-button"
                            aria-label={`编辑 ${user.nickname}`}
                            onClick={() =>
                              setUserModal({
                                mode: "edit",
                                userId: user.uid,
                                username: user.username,
                                nickname: user.nickname,
                                email: user.email || "",
                                phone: user.phone || ""
                              })
                            }
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            className="cv-secondary-button"
                            aria-label={`重置密码 ${user.nickname}`}
                            onClick={() => void handleResetPassword(user)}
                          >
                            重置密码
                          </button>
                          <button
                            type="button"
                            className="cv-secondary-button"
                            aria-label={`删除 ${user.nickname}`}
                            onClick={() => setDeleteTarget(user)}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="cv-permission-card cv-permission-card--inspector">
            <div className="cv-panel-header">
              <div>
                <h3 className="cv-panel-title cv-permission-card__title">授权详情</h3>
                <p className="cv-muted">
                  {selectedUser
                    ? `${selectedUser.nickname} 的实例授权`
                    : "请选择一个用户查看授权"}
                </p>
              </div>
              <button
                type="button"
                className="cv-action-button"
                onClick={() =>
                    setGrantModal({
                      instanceId: instances[0]?.id ? String(instances[0].id) : "",
                      roleId: instanceGrants[instances[0]?.id || 0]?.roles[0]?.id
                        ? String(instanceGrants[instances[0]?.id || 0]?.roles[0]?.id)
                        : "",
                      domain: "*"
                    })
                }
                disabled={!selectedUser || instances.length === 0}
              >
                新增授权
              </button>
            </div>
            {selectedUser && selectedUserGrants.length > 0 ? (
              <div className="cv-permission-grant-list">
                {selectedUserGrants.map((grant) => {
                  const domainLabel = grant.domain.join(" / ");
                  return (
                    <div
                      key={`${grant.instanceId}-${grant.roleId}-${grant.domain.join("__")}`}
                      className="cv-permission-grant-item"
                    >
                      <div>
                        <div className="cv-permission-item-title-row">
                          <strong>{grant.instanceName}</strong>
                          <span className="cv-permission-inline-chip">{grant.roleName}</span>
                        </div>
                        <div className="cv-muted">{grant.roleDesc || "未填写角色说明"}</div>
                        <div className="cv-muted">{domainLabel}</div>
                      </div>
                      <button
                        type="button"
                        className="cv-secondary-button"
                        aria-label={`移除授权 ${grant.roleName} ${grant.domain.join(" ")}`}
                        onClick={() => void handleRemoveGrant(grant)}
                      >
                        移除授权
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="cv-muted cv-permission-empty-inline">当前用户还没有实例级角色授权。</div>
            )}
          </section>
        </div>
      ) : null}

      {grantModal ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section
            className="cv-report-modal cv-permission-user-grant-modal"
            role="dialog"
            aria-label="新增授权"
          >
            <div className="cv-panel-header cv-permission-user-grant-modal__header">
              <div>
                <h2 className="cv-panel-title">新增授权</h2>
              </div>
              <span className="cv-permission-inline-chip">实例级授权</span>
            </div>

            <div className="cv-permission-user-grant-modal__summary">
              <div className="cv-permission-user-grant-modal__summary-item">
                <span className="cv-label">目标用户</span>
                <strong>
                  {selectedUser
                    ? `${selectedUser.nickname || selectedUser.username} (${selectedUser.username})`
                    : "未选择用户"}
                </strong>
              </div>
              <div className="cv-permission-user-grant-modal__summary-item">
                <span className="cv-label">角色说明</span>
                <strong>{selectedGrantRole?.desc || "请选择可授权角色"}</strong>
              </div>
            </div>

            <div className="cv-form-grid cv-permission-user-grant-modal__grid">
              <label className="cv-form-row cv-permission-user-grant-modal__field">
                <span className="cv-label">授权实例</span>
                <select
                  aria-label="授权实例"
                  className="cv-input"
                  value={grantModal.instanceId}
                  onChange={(event) => {
                    const nextInstanceId = event.target.value;
                    const nextRoles = instanceGrants[Number(nextInstanceId)]?.roles ?? [];
                    setGrantModal({
                      instanceId: nextInstanceId,
                      roleId: nextRoles[0]?.id ? String(nextRoles[0]?.id) : "",
                      domain: "*"
                    });
                  }}
                >
                  {instances.map((instance) => (
                    <option key={instance.id} value={instance.id}>
                      {instance.name}
                    </option>
                  ))}
                </select>
                <span className="cv-muted">切换后同步刷新角色。</span>
              </label>

              <label className="cv-form-row cv-permission-user-grant-modal__field">
                <span className="cv-label">角色</span>
                <select
                  aria-label="角色"
                  className="cv-input"
                  value={grantModal.roleId}
                  onChange={(event) =>
                    setGrantModal({
                      ...grantModal,
                      roleId: event.target.value
                    })
                  }
                >
                  {availableRoles.length === 0 ? (
                    <option value="">当前实例暂无可授权角色</option>
                  ) : null}
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <span className="cv-muted">
                  {selectedGrantRole?.desc || "请选择角色模板。"}
                </span>
              </label>

              <label className="cv-form-row cv-permission-user-grant-modal__field">
                <span className="cv-label">数据域</span>
                <select
                  aria-label="数据域"
                  className="cv-input"
                  value={grantModal.domain}
                  onChange={(event) =>
                    setGrantModal({
                      ...grantModal,
                      domain: event.target.value
                    })
                  }
                >
                  {domainOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="cv-muted">
                  {selectedDomainOption?.label || "选择生效范围。"}
                </span>
              </label>
            </div>

            <div className="cv-permission-user-grant-modal__notice">
              保存后立即生效。
            </div>

            <div className="cv-header-actions">
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setGrantModal(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="cv-action-button"
                disabled={!grantModal.roleId}
                onClick={() => void handleSaveGrant()}
              >
                保存授权
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {userModal ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section className="cv-report-modal" role="dialog" aria-label={userModal.mode === "create" ? "新增用户" : "编辑用户"}>
            <div className="cv-panel-header">
              <div>
                <h2 className="cv-panel-title">
                  {userModal.mode === "create" ? "新增用户" : "编辑用户"}
                </h2>
              </div>
            </div>
            <div className="cv-form-grid">
              {userModal.mode === "create" ? (
                <>
                  <label className="cv-form-row">
                    <span className="cv-label">登录名</span>
                    <input
                      aria-label="登录名"
                      className="cv-input"
                      value={userModal.username}
                      onChange={(event) =>
                        setUserModal({
                          ...userModal,
                          username: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className="cv-form-row">
                    <span className="cv-label">显示名</span>
                    <input
                      aria-label="显示名"
                      className="cv-input"
                      value={userModal.nickname}
                      onChange={(event) =>
                        setUserModal({
                          ...userModal,
                          nickname: event.target.value
                        })
                      }
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="cv-form-row">
                    <span className="cv-label">登录名</span>
                    <input
                      aria-label="登录名"
                      className="cv-input"
                      value={userModal.username}
                      disabled
                    />
                  </label>
                  <label className="cv-form-row">
                    <span className="cv-label">昵称</span>
                    <input
                      aria-label="昵称"
                      className="cv-input"
                      value={userModal.nickname}
                      onChange={(event) =>
                        setUserModal({
                          ...userModal,
                          nickname: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className="cv-form-row">
                    <span className="cv-label">邮箱</span>
                    <input
                      aria-label="邮箱"
                      className="cv-input"
                      value={userModal.email}
                      onChange={(event) =>
                        setUserModal({
                          ...userModal,
                          email: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className="cv-form-row">
                    <span className="cv-label">手机号</span>
                    <input
                      aria-label="手机号"
                      className="cv-input"
                      value={userModal.phone}
                      onChange={(event) =>
                        setUserModal({
                          ...userModal,
                          phone: event.target.value
                        })
                      }
                    />
                  </label>
                </>
              )}
            </div>
            <div className="cv-header-actions">
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setUserModal(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="cv-action-button"
                onClick={() => void handleSubmitUser()}
              >
                {userModal.mode === "create" ? "保存用户" : "保存资料"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section className="cv-report-modal" role="dialog" aria-label="删除用户确认">
            <div className="cv-panel-header">
              <div>
                <h2 className="cv-panel-title">删除用户确认</h2>
                <p className="cv-panel-description">确认删除 {deleteTarget.nickname}</p>
              </div>
            </div>
            <div className="cv-header-actions">
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setDeleteTarget(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="cv-action-button"
                onClick={() => void handleDeleteUser()}
              >
                确认删除
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </PermissionCenterLayout>
  );
}
