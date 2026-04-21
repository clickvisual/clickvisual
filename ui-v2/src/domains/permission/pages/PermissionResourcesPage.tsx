import { useEffect, useMemo, useState } from "react";
import PermissionCenterLayout from "../components/PermissionCenterLayout";
import PermissionMultiSelect from "../components/PermissionMultiSelect";
import {
  getPermissionCommonInfo,
  getPermissionInstanceGrant,
  listPermissionInstances,
  listPermissionRoles,
  listPermissionUsers,
  updatePermissionInstanceGrant,
  type PermissionCommonInfo,
  type PermissionInstance,
  type PermissionInstanceGrant,
  type PermissionRole,
  type PermissionUser
} from "../api/permission";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/state/PageState";

type FeedbackState =
  | { tone: "status" | "alert"; message: string }
  | null;

type GrantModalState = {
  roleId: number;
  roleName: string;
  grants: Array<{
    created: number;
    domain: string;
    userIds: string[];
  }>;
};

type BindRoleModalState = {
  roleId: string;
} | null;

export default function PermissionResourcesPage() {
  const [instances, setInstances] = useState<PermissionInstance[]>([]);
  const [users, setUsers] = useState<PermissionUser[]>([]);
  const [commonInfo, setCommonInfo] = useState<PermissionCommonInfo | null>(null);
  const [roleTemplates, setRoleTemplates] = useState<PermissionRole[]>([]);
  const [grantMap, setGrantMap] = useState<Record<number, PermissionInstanceGrant>>({});
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null);
  const [grantModal, setGrantModal] = useState<GrantModalState | null>(null);
  const [bindRoleModal, setBindRoleModal] = useState<BindRoleModalState>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [nextInstances, nextUsers, nextCommonInfo, nextRoleTemplates] = await Promise.all([
          listPermissionInstances(),
          listPermissionUsers({
            current: 1,
            pageSize: 100
          }),
          getPermissionCommonInfo(),
          listPermissionRoles({
            belongResource: "instance"
          })
        ]);
        const grantEntries = await Promise.all(
          nextInstances.map(async (instance) => [
            instance.id,
            await getPermissionInstanceGrant(instance.id)
          ] as const)
        );
        setInstances(nextInstances);
        setUsers(nextUsers.list);
        setCommonInfo(nextCommonInfo);
        setRoleTemplates(
          nextRoleTemplates.filter((role) => role.belongResource === "instance" && role.roleType === 1)
        );
        setGrantMap(Object.fromEntries(grantEntries));
        setSelectedInstanceId(nextInstances[0]?.id ?? null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "资源授权加载失败");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  const selectedInstance = instances.find((item) => item.id === selectedInstanceId) ?? null;
  const selectedGrant = selectedInstanceId ? grantMap[selectedInstanceId] ?? null : null;

  const userNameMap = useMemo(
    () =>
      Object.fromEntries(
        users.map((user) => [user.uid, user.nickname || user.username] as const)
      ),
    [users]
  );

  const domainOptions = useMemo(() => {
    function flatten(
      items: NonNullable<PermissionCommonInfo["domainCascader"]>,
      parentPath: string[] = []
    ): Array<{ value: string; label: string }> {
      return items.flatMap((item) => {
        const nextPath = parentPath.concat(item.value);
        const current = {
          value: nextPath.join("__"),
          label: nextPath.join(" / ")
        };
        return item.children && item.children.length > 0
          ? flatten(item.children, nextPath)
          : [current];
      });
    }

    return commonInfo?.domainCascader ? flatten(commonInfo.domainCascader) : [{ value: "*", label: "*" }];
  }, [commonInfo]);

  function updateGrantDraft(
    index: number,
    field: "domain" | "userIds",
    value: string | string[]
  ) {
    if (!grantModal) {
      return;
    }

    setGrantModal({
      ...grantModal,
      grants: grantModal.grants.map((grant, grantIndex) =>
        grantIndex === index
          ? {
              ...grant,
              [field]: value
            }
          : grant
      )
    });
  }

  function addGrantDraftRow() {
    if (!grantModal) {
      return;
    }

    setGrantModal({
      ...grantModal,
      grants: grantModal.grants.concat({
        created: 0,
        domain: "*",
        userIds: []
      })
    });
  }

  function removeGrantDraftRow(index: number) {
    if (!grantModal) {
      return;
    }

    setGrantModal({
      ...grantModal,
      grants: grantModal.grants.filter((_, grantIndex) => grantIndex !== index)
    });
  }

  const bindableRoleTemplates = useMemo(() => {
    const currentRoleIds = new Set(selectedGrant?.roles.map((role) => role.id) ?? []);
    return roleTemplates.filter((role) => !currentRoleIds.has(role.id));
  }, [roleTemplates, selectedGrant]);

  const selectedBindRoleTemplate =
    bindRoleModal?.roleId
      ? bindableRoleTemplates.find((role) => String(role.id) === bindRoleModal.roleId) ?? null
      : null;

  function openBindRoleModal() {
    setBindRoleModal({
      roleId: bindableRoleTemplates[0]?.id ? String(bindableRoleTemplates[0].id) : ""
    });
  }

  function openGrantModalForRole(roleId: number) {
    const role =
      selectedGrant?.roles.find((entry) => entry.id === roleId) ??
      roleTemplates.find((entry) => entry.id === roleId);

    if (!role) {
      return;
    }

    const currentRole = selectedGrant?.roles.find((entry) => entry.id === roleId);
    setGrantModal({
      roleId: role.id,
      roleName: role.name,
      grants:
        currentRole && currentRole.grant.length > 0
          ? currentRole.grant.map((entry) => ({
              created: entry.created,
              domain: entry.domain.join("__"),
              userIds: entry.userIds.map(String)
            }))
          : [
              {
                created: 0,
                domain: "*",
                userIds: []
              }
            ]
    });
  }

  function handleBindRoleTemplate() {
    if (!bindRoleModal?.roleId) {
      return;
    }

    setBindRoleModal(null);
    openGrantModalForRole(Number(bindRoleModal.roleId));
  }

  async function handleSaveGrant() {
    if (!grantModal || !selectedInstanceId || !selectedGrant) {
      return;
    }

    const nextGrantEntries = grantModal.grants
      .map((grant) => ({
        created: grant.created,
        domain: grant.domain === "*" ? ["*"] : grant.domain.split("__").filter(Boolean),
        userIds: grant.userIds
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item) && item > 0)
      }))
      .filter((grant) => grant.domain.length > 0 && grant.userIds.length > 0);

    if (nextGrantEntries.length === 0) {
      setFeedback({
        tone: "alert",
        message: "请至少保留一条完整的授权记录。"
      });
      return;
    }

    const nextGrant: PermissionInstanceGrant = {
      ...selectedGrant,
      roles: (() => {
        const currentRole = selectedGrant.roles.find((role) => role.id === grantModal.roleId);
        if (currentRole) {
          return selectedGrant.roles.map((role) =>
            role.id === grantModal.roleId
              ? {
                  ...role,
                  grant: nextGrantEntries
                }
              : role
          );
        }

        const templateRole = roleTemplates.find((role) => role.id === grantModal.roleId);
        if (!templateRole) {
          return selectedGrant.roles;
        }

        return selectedGrant.roles.concat({
          id: templateRole.id,
          roleType: templateRole.roleType,
          name: templateRole.name,
          desc: templateRole.desc,
          details: templateRole.details.map((detail) => ({
            sub_resources: detail.subResources,
            acts: detail.acts
          })),
          grant: nextGrantEntries
        });
      })()
    };

    try {
      await updatePermissionInstanceGrant(selectedInstanceId, nextGrant);
      setGrantMap((current) => ({
        ...current,
        [selectedInstanceId]: nextGrant
      }));
      setGrantModal(null);
      setFeedback({
        tone: "status",
        message: "实例授权已更新"
      });
    } catch (error) {
      setFeedback({
        tone: "alert",
        message: error instanceof Error ? error.message : "实例授权更新失败"
      });
    }
  }

  return (
    <PermissionCenterLayout
      title="资源范围"
      description=""
      summary={`${instances.length} 个实例`}
    >
      {feedback ? (
        <div className="cv-status-card" role={feedback.tone}>
          {feedback.message}
        </div>
      ) : null}

      {loading ? (
        <LoadingState title="资源授权加载中" description="正在获取实例与授权关系。" />
      ) : null}

      {!loading && errorMessage ? (
        <ErrorState title="资源授权加载失败" description={errorMessage} />
      ) : null}

      {!loading && !errorMessage && instances.length === 0 ? (
        <EmptyState title="暂无实例" description="请先创建实例，再配置实例级角色授权。" />
      ) : null}

      {!loading && !errorMessage && instances.length > 0 ? (
        <div className="cv-permission-grid">
          <section className="cv-permission-card">
            <div className="cv-panel-header">
              <div>
                <h3 className="cv-panel-title cv-permission-card__title">实例列表</h3>
                <p className="cv-muted">按实例查看绑定关系。</p>
              </div>
            </div>
            <div className="cv-permission-role-list">
              {instances.map((instance) => (
                <article
                  key={instance.id}
                  className={`cv-permission-grant-item${
                    selectedInstanceId === instance.id ? " cv-permission-role-item--active" : ""
                  }`}
                >
                  <div>
                    <div className="cv-permission-item-title-row">
                      <strong>{instance.name}</strong>
                      <span className="cv-permission-inline-chip">{instance.datasource}</span>
                    </div>
                    <div className="cv-muted">{instance.desc || "未填写实例说明"}</div>
                  </div>
                  <button
                    type="button"
                    className="cv-secondary-button"
                    aria-label={`查看实例 ${instance.name}`}
                    onClick={() => setSelectedInstanceId(instance.id)}
                  >
                    查看
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="cv-permission-card">
            <div className="cv-panel-header">
              <div>
                <h3 className="cv-panel-title cv-permission-card__title">实例授权详情</h3>
                <p className="cv-muted">
                  {selectedInstance ? `${selectedInstance.name} 的角色与用户绑定` : "请选择实例"}
                </p>
              </div>
              {selectedInstance ? (
                <button
                  type="button"
                  className="cv-secondary-button"
                  onClick={openBindRoleModal}
                  disabled={bindableRoleTemplates.length === 0}
                >
                  选择角色模板
                </button>
              ) : null}
            </div>
            {selectedGrant ? (
              <div className="cv-permission-role-list">
                {selectedGrant.roles.map((role) => {
                  return (
                    <article key={role.id} className="cv-permission-grant-item">
                      <div>
                        <div>角色：{role.name}</div>
                        <div className="cv-muted">{role.desc || "未填写角色说明"}</div>
                        {role.grant.map((entry, index) => {
                          const userNames = entry.userIds.map(
                            (userId) => userNameMap[userId] || `UID:${userId}`
                          );
                          return (
                            <div key={`${role.id}-${index}`} className="cv-muted">
                              作用域：{entry.domain.join(" / ")} | 用户：
                              {userNames.length > 0 ? userNames.join("、") : "暂无绑定用户"}
                            </div>
                          );
                        })}
                      </div>
                      <div className="cv-settings-table-actions cv-permission-actions-compact">
                        <button
                          type="button"
                          className="cv-secondary-button"
                          aria-label={`调整授权 ${role.name}`}
                          onClick={() => openGrantModalForRole(role.id)}
                        >
                          调整
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="cv-muted cv-permission-empty-inline">当前实例没有角色授权数据。</div>
            )}
          </section>
        </div>
      ) : null}

      {grantModal ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section className="cv-report-modal" role="dialog" aria-label="调整实例授权">
            <div className="cv-panel-header">
              <div>
                <h2 className="cv-panel-title">调整实例授权</h2>
                <p className="cv-panel-description">角色 {grantModal.roleName}</p>
              </div>
            </div>
            <div className="cv-permission-role-detail-editor">
              {grantModal.grants.map((grant, index) => (
                <div
                  key={`${grantModal.roleId}-${index}`}
                  className="cv-permission-subsection cv-permission-rule-editor"
                >
                  <label className="cv-form-row">
                    <span className="cv-label">{`作用域 ${index + 1}`}</span>
                    <select
                      aria-label={`作用域 ${index + 1}`}
                      className="cv-input"
                      value={grant.domain}
                      disabled={grant.created === 1}
                      onChange={(event) => updateGrantDraft(index, "domain", event.target.value)}
                    >
                      {domainOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="cv-form-row">
                    <span className="cv-label">{`授权用户 ${index + 1}`}</span>
                    <PermissionMultiSelect
                      aria-label={`授权用户 ${index + 1}`}
                      value={grant.userIds}
                      placeholder="选择授权用户"
                      options={users.map((user) => ({
                        value: String(user.uid),
                        label: `${user.nickname || user.username} (${user.uid})`
                      }))}
                      onChange={(nextValue) => updateGrantDraft(index, "userIds", nextValue)}
                    />
                  </label>
                  {grantModal.grants.length > 1 ? (
                    <button
                      type="button"
                      className="cv-secondary-button"
                      onClick={() => removeGrantDraftRow(index)}
                    >
                      删除授权
                    </button>
                  ) : null}
                </div>
              ))}
              <button type="button" className="cv-secondary-button" onClick={addGrantDraftRow}>
                新增授权
              </button>
            </div>
            <div className="cv-header-actions">
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setGrantModal(null)}
              >
                取消
              </button>
              <button type="button" className="cv-action-button" onClick={() => void handleSaveGrant()}>
                保存调整
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {bindRoleModal ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section
            className="cv-report-modal cv-permission-bind-role-modal"
            role="dialog"
            aria-label="选择角色模板"
          >
            <div className="cv-panel-header cv-permission-bind-role-modal__header">
              <div>
                <h2 className="cv-panel-title">选择角色模板</h2>
                <p className="cv-panel-description">{selectedInstance?.name || "-"}</p>
              </div>
              <div className="cv-permission-root-modal__stats" aria-label="角色模板统计">
                <div className="cv-permission-root-modal__stat">
                  <span className="cv-label">可选模板</span>
                  <strong>{bindableRoleTemplates.length}</strong>
                </div>
                <div className="cv-permission-root-modal__stat">
                  <span className="cv-label">已绑定</span>
                  <strong>{selectedGrant?.roles.length ?? 0}</strong>
                </div>
              </div>
            </div>

            <div className="cv-permission-user-grant-modal__summary">
              <div className="cv-permission-user-grant-modal__summary-item">
                <span className="cv-label">当前实例</span>
                <strong>{selectedInstance?.name || "-"}</strong>
              </div>
              <div className="cv-permission-user-grant-modal__summary-item">
                <span className="cv-label">模板说明</span>
                <strong>{selectedBindRoleTemplate?.desc || "请选择可绑定的角色模板"}</strong>
              </div>
            </div>

            <div className="cv-form-grid cv-permission-user-grant-modal__grid">
              <label className="cv-form-row cv-permission-user-grant-modal__field">
                <span className="cv-label">角色模板</span>
                <select
                  aria-label="角色模板"
                  className="cv-input"
                  value={bindRoleModal.roleId}
                  onChange={(event) =>
                    setBindRoleModal({
                      roleId: event.target.value
                    })
                  }
                >
                  {bindableRoleTemplates.length === 0 ? (
                    <option value="">当前实例已绑定全部模板角色</option>
                  ) : null}
                  {bindableRoleTemplates.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <span className="cv-muted">
                  {selectedBindRoleTemplate
                    ? `模板角色 ${selectedBindRoleTemplate.name}`
                    : "选择未绑定模板。"}
                </span>
              </label>
            </div>

            <div className="cv-permission-user-grant-modal__notice">
              下一步配置数据域和用户。
            </div>

            <div className="cv-header-actions">
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setBindRoleModal(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="cv-action-button"
                disabled={!bindRoleModal.roleId}
                onClick={handleBindRoleTemplate}
              >
                下一步配置授权
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </PermissionCenterLayout>
  );
}
