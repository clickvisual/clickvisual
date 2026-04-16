import { useEffect, useMemo, useState } from "react";
import PermissionCenterLayout from "../components/PermissionCenterLayout";
import PermissionMultiSelect from "../components/PermissionMultiSelect";
import {
  createPermissionRole,
  deletePermissionRole,
  getPermissionCommonInfo,
  getPermissionRoleDetail,
  listPermissionRoles,
  updatePermissionRole,
  type PermissionCommonInfo,
  type PermissionRole
} from "../api/permission";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/state/PageState";

type FeedbackState =
  | { tone: "status" | "alert"; message: string }
  | null;

type PrefixInfo = {
  name: string;
  desc: string;
};

type PermissionCommonInfoWithPrefixes = {
  prefixes_info?: PrefixInfo[];
};

type RoleModalState = {
  mode: "create" | "edit";
  roleId?: number;
  name: string;
  desc: string;
  belongResource: string;
  roleType: number;
  resourceId: string;
  details: Array<{
    subResources: string[];
    acts: string[];
  }>;
};

function getRoleTypeLabel(roleType: number) {
  if (roleType === 1) {
    return "默认角色";
  }
  if (roleType === 2) {
    return "自定义角色";
  }
  return `未知类型(${roleType})`;
}

export default function PermissionRolesPage() {
  const [roles, setRoles] = useState<PermissionRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<PermissionRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [resourceDraft, setResourceDraft] = useState("");
  const [nameKeyword, setNameKeyword] = useState("");
  const [resourceKeyword, setResourceKeyword] = useState("");
  const [resourceOptions, setResourceOptions] = useState<PrefixInfo[]>([]);
  const [commonInfo, setCommonInfo] = useState<PermissionCommonInfo | null>(null);
  const [roleModal, setRoleModal] = useState<RoleModalState | null>(null);

  async function loadRoles(nextFilters?: {
    name?: string;
    belongResource?: string;
  }) {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await listPermissionRoles({
        name: nextFilters?.name ?? nameKeyword,
        belongResource: nextFilters?.belongResource ?? resourceKeyword
      });
      setRoles(response);
      setSelectedRole((currentSelectedRole) =>
        currentSelectedRole
          ? response.find((item) => item.id === currentSelectedRole.id) ?? null
          : null
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "角色列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const commonInfo =
          (await getPermissionCommonInfo()) as PermissionCommonInfoWithPrefixes;
        setCommonInfo(commonInfo as PermissionCommonInfo);
        setResourceOptions(commonInfo.prefixes_info ?? []);
      } catch (error) {
        setFeedback({
          tone: "alert",
          message: error instanceof Error ? error.message : "权限元数据加载失败"
        });
      }
    }

    void bootstrap();
    void loadRoles({
      name: "",
      belongResource: ""
    });
  }, []);

  const selectedRoleDetails = useMemo(
    () => selectedRole?.details ?? [],
    [selectedRole]
  );

  async function handleInspectRole(role: PermissionRole) {
    try {
      const detail = await getPermissionRoleDetail(role.id);
      setSelectedRole(detail);
      setFeedback(null);
    } catch (error) {
      setFeedback({
        tone: "alert",
        message: error instanceof Error ? error.message : "角色详情加载失败"
      });
    }
  }

  function openCreateRoleModal() {
    setRoleModal({
      mode: "create",
      name: "",
      desc: "",
      belongResource: resourceOptions[0]?.name || "instance",
      roleType: 1,
      resourceId: "0",
      details: [
        {
          subResources: [],
          acts: []
        }
      ]
    });
  }

  function openEditRoleModal(role: PermissionRole) {
    setRoleModal({
      mode: "edit",
      roleId: role.id,
      name: role.name,
      desc: role.desc,
      belongResource: role.belongResource,
      roleType: role.roleType,
      resourceId: String(role.resourceId),
      details: role.details.length > 0
        ? role.details.map((detail) => ({
            subResources: detail.subResources,
            acts: detail.acts
          }))
        : [
            {
              subResources: [],
              acts: []
            }
          ]
    });
  }

  async function handleSaveRole() {
    if (!roleModal) {
      return;
    }

    const name = roleModal.name.trim();
    const desc = roleModal.desc.trim();
    const details = roleModal.details.filter(
      (detail) => detail.subResources.length > 0 && detail.acts.length > 0
    );

    if (!name || !desc || !roleModal.belongResource || details.length === 0) {
      setFeedback({
        tone: "alert",
        message: "请完整填写角色名称、角色描述和至少一条资源授权。"
      });
      return;
    }

    const payload = {
      name,
      desc,
      belongResource: roleModal.belongResource,
      roleType: roleModal.roleType,
      resourceId: Number(roleModal.resourceId || "0"),
      details
    };

    try {
      if (roleModal.mode === "create") {
        await createPermissionRole(payload);
        setFeedback({
          tone: "status",
          message: "角色已创建"
        });
      } else if (roleModal.roleId) {
        await updatePermissionRole(roleModal.roleId, payload);
        setFeedback({
          tone: "status",
          message: "角色已更新"
        });
      }
      setRoleModal(null);
      await loadRoles({
        name: nameKeyword,
        belongResource: resourceKeyword
      });
    } catch (error) {
      setFeedback({
        tone: "alert",
        message: error instanceof Error ? error.message : "角色保存失败"
      });
    }
  }

  async function handleDeleteRole(role: PermissionRole) {
    try {
      await deletePermissionRole(role.id, {
        belongResource: role.belongResource,
        resourceId: role.resourceId
      });
      setFeedback({
        tone: "status",
        message: "角色已删除"
      });
      if (selectedRole?.id === role.id) {
        setSelectedRole(null);
      }
      await loadRoles({
        name: nameKeyword,
        belongResource: resourceKeyword
      });
    } catch (error) {
      setFeedback({
        tone: "alert",
        message: error instanceof Error ? error.message : "角色删除失败"
      });
    }
  }

  function handleSearch() {
    setNameKeyword(nameDraft.trim());
    setResourceKeyword(resourceDraft);
    void loadRoles({
      name: nameDraft.trim(),
      belongResource: resourceDraft
    });
  }

  function updateRoleDetail(index: number, field: "subResources" | "acts", value: string[]) {
    if (!roleModal) {
      return;
    }
    setRoleModal({
      ...roleModal,
      details: roleModal.details.map((detail, detailIndex) =>
        detailIndex === index
          ? {
              ...detail,
              [field]: value
            }
          : detail
      )
    });
  }

  function addRoleDetailRow() {
    if (!roleModal) {
      return;
    }
    setRoleModal({
      ...roleModal,
      details: roleModal.details.concat({
        subResources: [],
        acts: []
      })
    });
  }

  function removeRoleDetailRow(index: number) {
    if (!roleModal || roleModal.details.length <= 1) {
      return;
    }
    setRoleModal({
      ...roleModal,
      details: roleModal.details.filter((_, detailIndex) => detailIndex !== index)
    });
  }

  return (
    <PermissionCenterLayout
      title="角色配置"
      description=""
      summary={`${roles.length} 个角色`}
    >
      <div className="cv-permission-toolbar">
        <div className="cv-form-two-up cv-permission-roles-filter">
          <label className="cv-form-row">
            <span className="cv-label">角色名称过滤</span>
            <input
              className="cv-input"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              placeholder="按角色名称筛选"
            />
          </label>
          <label className="cv-form-row">
            <span className="cv-label">所属资源过滤</span>
            <select
              className="cv-input"
              aria-label="所属资源过滤"
              value={resourceDraft}
              onChange={(event) => setResourceDraft(event.target.value)}
            >
              <option value="">全部资源</option>
              {resourceOptions.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.desc} ({item.name})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="cv-permission-toolbar__meta">
          <div className="cv-permission-toolbar__stat">
            <span className="cv-label">当前结果</span>
            <strong>{roles.length}</strong>
          </div>
          <button type="button" className="cv-secondary-button" onClick={openCreateRoleModal}>
            新增角色
          </button>
          <button type="button" className="cv-action-button" onClick={handleSearch}>
            查询角色
          </button>
        </div>
      </div>

      {feedback ? (
        <div className="cv-status-card" role={feedback.tone}>
          {feedback.message}
        </div>
      ) : null}

      {loading ? (
        <LoadingState title="角色配置加载中" description="正在拉取角色定义。" />
      ) : null}

      {!loading && errorMessage ? (
        <ErrorState
          title="角色配置加载失败"
          description={errorMessage}
          actions={
            <button type="button" className="cv-action-button" onClick={handleSearch}>
              重新加载
            </button>
          }
        />
      ) : null}

      {!loading && !errorMessage && roles.length === 0 ? (
        <EmptyState
          title="没有匹配的角色配置"
          description="调整筛选条件后再试。"
        />
      ) : null}

      {!loading && !errorMessage && roles.length > 0 ? (
        <div className="cv-permission-grid">
          <section className="cv-permission-card">
            <div className="cv-panel-header">
              <div>
                <h3 className="cv-panel-title cv-permission-card__title">角色列表</h3>
                <p className="cv-muted">按资源查看模板。</p>
              </div>
            </div>
            <div className="cv-permission-role-list">
              {roles.map((role) => (
                <article
                  key={role.id}
                  className={`cv-permission-grant-item${
                    selectedRole?.id === role.id ? " cv-permission-role-item--active" : ""
                  }`}
                >
                  <div>
                    <div className="cv-permission-item-title-row">
                      <strong>{role.name}</strong>
                      <span className="cv-permission-inline-chip">
                        {getRoleTypeLabel(role.roleType)}
                      </span>
                    </div>
                    <div className="cv-muted">{role.desc || "未填写角色说明"}</div>
                    <div className="cv-muted cv-permission-inline-meta">
                      <span>资源：{role.belongResource}</span>
                      <span>ID：{role.resourceId}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cv-secondary-button"
                    onClick={() => void handleInspectRole(role)}
                    aria-label={`查看角色 ${role.name}`}
                  >
                    查看
                  </button>
                  <button
                    type="button"
                    className="cv-secondary-button"
                    aria-label={`编辑角色 ${role.name}`}
                    onClick={() => openEditRoleModal(role)}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="cv-secondary-button"
                    aria-label={`删除角色 ${role.name}`}
                    onClick={() => void handleDeleteRole(role)}
                  >
                    删除
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="cv-permission-card">
            <div className="cv-panel-header">
              <div>
                <h3 className="cv-panel-title cv-permission-card__title">角色详情</h3>
                <p className="cv-muted">核对子资源与动作范围。</p>
              </div>
            </div>
            {selectedRole ? (
              <div className="cv-permission-role-detail">
                <div className="cv-permission-detail-grid">
                  <div className="cv-permission-detail-row">
                    <span className="cv-muted">角色名称：{selectedRole.name}</span>
                  </div>
                  <div className="cv-permission-detail-row">
                    <span className="cv-muted">角色类型：{getRoleTypeLabel(selectedRole.roleType)}</span>
                  </div>
                  <div className="cv-permission-detail-row">
                    <span className="cv-muted">所属资源：{selectedRole.belongResource}</span>
                  </div>
                  <div className="cv-permission-detail-row">
                    <span className="cv-muted">资源 ID：{selectedRole.resourceId}</span>
                  </div>
                </div>
                <div className="cv-muted">角色说明：{selectedRole.desc || "未填写角色说明"}</div>
                {selectedRoleDetails.map((detail, index) => (
                  <div key={`${selectedRole.id}-${index}`} className="cv-permission-subsection">
                    <div className="cv-permission-detail-row">
                      <span className="cv-muted">子资源：{detail.subResources.join(", ") || "无"}</span>
                    </div>
                    <div className="cv-permission-detail-row">
                      <span className="cv-muted">动作：{detail.acts.join(", ") || "无"}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cv-muted cv-permission-empty-inline">选择左侧角色后查看明细。</div>
            )}
          </section>
        </div>
      ) : null}

      {roleModal ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section className="cv-report-modal" role="dialog" aria-label="角色编辑">
            <div className="cv-panel-header">
              <div>
                <h2 className="cv-panel-title">
                  {roleModal.mode === "create" ? "新增角色" : "编辑角色"}
                </h2>
              </div>
            </div>
            <div className="cv-form-grid">
              <label className="cv-form-row">
                <span className="cv-label">所属资源</span>
                <select
                  aria-label="所属资源"
                  className="cv-input"
                  value={roleModal.belongResource}
                  disabled={roleModal.mode === "edit"}
                  onChange={(event) =>
                    setRoleModal({
                      ...roleModal,
                      belongResource: event.target.value
                    })
                  }
                >
                  {resourceOptions.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.desc}
                    </option>
                  ))}
                </select>
              </label>
              <label className="cv-form-row">
                <span className="cv-label">角色英文名</span>
                <input
                  aria-label="角色英文名"
                  className="cv-input"
                  value={roleModal.name}
                  onChange={(event) =>
                    setRoleModal({
                      ...roleModal,
                      name: event.target.value
                    })
                  }
                />
              </label>
              <label className="cv-form-row">
                <span className="cv-label">角色描述</span>
                <input
                  aria-label="角色说明"
                  className="cv-input"
                  value={roleModal.desc}
                  onChange={(event) =>
                    setRoleModal({
                      ...roleModal,
                      desc: event.target.value
                    })
                  }
                />
              </label>
            </div>
            <div className="cv-muted">
              {roleModal.mode === "create"
                ? "实例绑定放到资源范围中处理。"
                : `当前角色类型：${getRoleTypeLabel(roleModal.roleType)}，资源 ID：${roleModal.resourceId}`}
            </div>
            <div className="cv-permission-role-detail-editor">
              {roleModal.details.map((detail, index) => (
                <div
                  key={`role-detail-${index}`}
                  className="cv-permission-subsection cv-permission-rule-editor"
                >
                  <label className="cv-form-row">
                    <span className="cv-label">{`子资源 ${index + 1}`}</span>
                    <PermissionMultiSelect
                      aria-label={`子资源 ${index + 1}`}
                      value={detail.subResources}
                      placeholder="选择子资源"
                      options={
                        commonInfo?.app_subResources_info?.map((item) => ({
                          value: item.name,
                          label: `${item.desc} (${item.name})`
                        })) ?? []
                      }
                      onChange={(nextValue) => updateRoleDetail(index, "subResources", nextValue)}
                    />
                  </label>
                  <label className="cv-form-row">
                    <span className="cv-label">{`准许操作 ${index + 1}`}</span>
                    <PermissionMultiSelect
                      aria-label={`准许操作 ${index + 1}`}
                      value={detail.acts}
                      placeholder="选择准许操作"
                      options={
                        commonInfo?.all_acts_info?.map((item) => ({
                          value: item.name,
                          label: `${item.desc} (${item.name})`
                        })) ?? []
                      }
                      onChange={(nextValue) => updateRoleDetail(index, "acts", nextValue)}
                    />
                  </label>
                  {roleModal.details.length > 1 ? (
                    <button
                      type="button"
                      className="cv-secondary-button"
                      onClick={() => removeRoleDetailRow(index)}
                    >
                      删除规则
                    </button>
                  ) : null}
                </div>
              ))}
              <button type="button" className="cv-secondary-button" onClick={addRoleDetailRow}>
                新增资源授权
              </button>
            </div>
            <div className="cv-header-actions">
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setRoleModal(null)}
              >
                取消
              </button>
              <button type="button" className="cv-action-button" onClick={() => void handleSaveRole()}>
                保存角色
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </PermissionCenterLayout>
  );
}
