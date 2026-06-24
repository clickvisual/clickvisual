import { useEffect, useMemo, useState } from "react";
import PermissionCenterLayout from "../components/PermissionCenterLayout";
import {
  getPermissionRootUids,
  grantPermissionRootUids,
  listPermissionUsers,
  type PermissionUser
} from "../api/permission";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/state/PageState";

type FeedbackState =
  | { tone: "status" | "alert"; message: string }
  | null;

type RootConfirmState =
  | {
      mode: "grant" | "revoke";
      uid: number;
      nextRootUids: number[];
    }
  | null;

const ROOT_USER_PAGE_SIZE = 200;

async function loadAllPermissionUsers() {
  const records: PermissionUser[] = [];
  let current = 1;
  let total = 0;

  do {
    const response = await listPermissionUsers({
      current,
      pageSize: ROOT_USER_PAGE_SIZE
    });
    records.push(...response.list);
    total = response.total;
    current += 1;
  } while (records.length < total);

  return records;
}

export default function PermissionRootPage() {
  const [users, setUsers] = useState<PermissionUser[]>([]);
  const [rootUids, setRootUids] = useState<number[]>([]);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantKeyword, setGrantKeyword] = useState("");
  const [selectedGrantUid, setSelectedGrantUid] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [confirmState, setConfirmState] = useState<RootConfirmState>(null);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [nextUsers, rootInfo] = await Promise.all([
          loadAllPermissionUsers(),
          getPermissionRootUids()
        ]);
        setUsers(nextUsers);
        setRootUids(rootInfo.root_uids);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Root 管理加载失败");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  const rootUsers = useMemo(
    () => users.filter((user) => rootUids.includes(user.uid)),
    [rootUids, users]
  );

  const filteredGrantUsers = useMemo(() => {
    const keyword = grantKeyword.trim().toLowerCase();

    return users.filter((user) => {
      if (!keyword) {
        return true;
      }

      return (
        user.username.toLowerCase().includes(keyword) ||
        user.nickname.toLowerCase().includes(keyword)
      );
    });
  }, [grantKeyword, users]);

  const selectedGrantUser =
    selectedGrantUid !== null ? users.find((user) => user.uid === selectedGrantUid) ?? null : null;

  const grantableUsersCount = filteredGrantUsers.filter((user) => !rootUids.includes(user.uid)).length;

  const confirmTargetUser =
    confirmState !== null ? users.find((user) => user.uid === confirmState.uid) ?? null : null;

  async function submitRoots(nextRootUids: number[]) {
    try {
      await grantPermissionRootUids({
        root_uids: nextRootUids
      });
      setRootUids(nextRootUids);
      setFeedback({
        tone: "status",
        message: "Root 授权已更新"
      });
    } catch (error) {
      setFeedback({
        tone: "alert",
        message: error instanceof Error ? error.message : "Root 授权更新失败"
      });
    }
  }

  function openGrantModal() {
    setGrantKeyword("");
    setSelectedGrantUid(null);
    setGrantModalOpen(true);
  }

  function handleGrantRoot() {
    if (!selectedGrantUid) {
      setFeedback({
        tone: "alert",
        message: "请选择要授予 Root 的用户"
      });
      return;
    }

    setGrantModalOpen(false);
    setConfirmState({
      mode: "grant",
      uid: selectedGrantUid,
      nextRootUids: Array.from(new Set([...rootUids, selectedGrantUid]))
    });
  }

  function handleRemoveRoot(uid: number) {
    setConfirmState({
      mode: "revoke",
      uid,
      nextRootUids: rootUids.filter((item) => item !== uid)
    });
  }

  async function handleConfirmRootChange() {
    if (!confirmState) {
      return;
    }
    await submitRoots(confirmState.nextRootUids);
    setConfirmState(null);
  }

  return (
    <PermissionCenterLayout
      title="Root 管理"
      description=""
      summary={`${rootUids.length} 个 Root`}
    >
      {feedback ? (
        <div className="cv-status-card" role={feedback.tone}>
          {feedback.message}
        </div>
      ) : null}

      {loading ? (
        <LoadingState title="Root 权限加载中" description="正在获取 Root 用户列表。" />
      ) : null}

      {!loading && errorMessage ? (
        <ErrorState title="Root 权限加载失败" description={errorMessage} />
      ) : null}

      {!loading && !errorMessage ? (
        <div className="cv-permission-grid">
          <section className="cv-permission-card cv-permission-card--danger">
            <div className="cv-panel-header">
              <div>
                <h3 className="cv-panel-title cv-permission-card__title">风险提醒</h3>
                <p className="cv-muted">
                  仅授予可信管理员，变更后立即复核。
                </p>
              </div>
            </div>
            <div className="cv-header-actions">
              <button type="button" className="cv-action-button" onClick={openGrantModal}>
                选择用户授予 Root
              </button>
            </div>
          </section>

          <section className="cv-permission-card">
            <div className="cv-panel-header">
              <div>
                <h3 className="cv-panel-title cv-permission-card__title">当前 Root 用户</h3>
                <p className="cv-muted">提交会覆盖当前名单。</p>
              </div>
            </div>
            {rootUsers.length > 0 ? (
              <div className="cv-permission-role-list">
                {rootUsers.map((user) => (
                  <article key={user.uid} className="cv-permission-grant-item">
                    <div>
                      <div className="cv-permission-item-title-row">
                        <strong>{user.nickname || user.username}</strong>
                        <span className="cv-permission-inline-chip">UID {user.uid}</span>
                      </div>
                      <div className="cv-muted">{user.username}</div>
                    </div>
                    <button
                      type="button"
                      className="cv-secondary-button"
                      aria-label={`撤销 Root ${user.nickname || user.username}`}
                      onClick={() => handleRemoveRoot(user.uid)}
                    >
                      撤销
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="暂无 Root 用户" description="请先指定至少一位超级管理员。" />
            )}
          </section>
        </div>
      ) : null}

      {confirmState ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section
            className="cv-report-modal cv-permission-root-confirm"
            role="dialog"
            aria-label="Root 权限确认"
          >
            <div className="cv-panel-header cv-permission-root-confirm__header">
              <div>
                <h2 className="cv-panel-title">
                  {confirmState.mode === "grant" ? "确认授予 Root" : "确认撤销 Root"}
                </h2>
                <p className="cv-panel-description">{confirmTargetUser?.username || `UID ${confirmState.uid}`}</p>
              </div>
              <span className="cv-permission-inline-chip">
                {confirmState.mode === "grant" ? "高风险授权" : "权限回收"}
              </span>
            </div>
            <div className="cv-permission-root-confirm__summary">
              <div className="cv-permission-root-confirm__identity">
                <span className="cv-label">目标用户</span>
                <strong>
                  {confirmTargetUser
                    ? `${confirmTargetUser.nickname || confirmTargetUser.username} (${confirmTargetUser.username})`
                    : `用户 ID ${confirmState.uid}`}
                </strong>
              </div>
              <div className="cv-permission-root-confirm__meta">
                <div className="cv-permission-root-confirm__meta-item">
                  <span className="cv-label">UID</span>
                  <strong>{confirmState.uid}</strong>
                </div>
                <div className="cv-permission-root-confirm__meta-item">
                  <span className="cv-label">操作</span>
                  <strong>{confirmState.mode === "grant" ? "授予 Root" : "撤销 Root"}</strong>
                </div>
              </div>
            </div>
            <div className="cv-permission-root-confirm__notice">
              Root 变更会立即生效。
            </div>
            <div className="cv-header-actions">
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setConfirmState(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="cv-action-button"
                onClick={() => void handleConfirmRootChange()}
              >
                {confirmState.mode === "grant" ? "确认授予" : "确认撤销"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {grantModalOpen ? (
        <div className="cv-report-modal-backdrop" role="presentation">
          <section
            className="cv-report-modal cv-permission-root-modal"
            role="dialog"
            aria-label="选择 Root 用户"
          >
            <div className="cv-panel-header cv-permission-root-modal__header">
              <div>
                <h2 className="cv-panel-title">选择 Root 用户</h2>
                <p className="cv-panel-description">按用户名或昵称搜索。</p>
              </div>
              <div className="cv-permission-root-modal__stats" aria-label="Root 用户筛选统计">
                <div className="cv-permission-root-modal__stat">
                  <span className="cv-label">匹配</span>
                  <strong>{filteredGrantUsers.length}</strong>
                </div>
                <div className="cv-permission-root-modal__stat">
                  <span className="cv-label">可授权</span>
                  <strong>{grantableUsersCount}</strong>
                </div>
              </div>
            </div>

            <div className="cv-permission-root-modal__toolbar">
              <label className="cv-form-row cv-permission-search">
                <span className="cv-label">搜索用户</span>
                <input
                  aria-label="搜索 Root 用户"
                  className="cv-input"
                  value={grantKeyword}
                  onChange={(event) => setGrantKeyword(event.target.value)}
                  placeholder="按用户名或昵称搜索用户"
                />
              </label>
              <div className="cv-permission-root-modal__selection" aria-live="polite">
                <span className="cv-label">当前选择</span>
                <strong>
                  {selectedGrantUser
                    ? `${selectedGrantUser.nickname || selectedGrantUser.username} (${selectedGrantUser.username})`
                    : "未选择用户"}
                </strong>
              </div>
            </div>

            {filteredGrantUsers.length > 0 ? (
              <div className="cv-permission-root-modal__list" role="list">
                <div className="cv-permission-root-modal__list-head" aria-hidden="true">
                  <span>显示名</span>
                  <span>登录名</span>
                  <span>状态</span>
                  <span>操作</span>
                </div>
                {filteredGrantUsers.map((user) => {
                  const isRootUser = rootUids.includes(user.uid);
                  const isSelected = selectedGrantUid === user.uid;

                  return (
                    <button
                      key={user.uid}
                      type="button"
                      className={`cv-permission-user-picker cv-permission-root-modal__row${
                        isSelected ? " cv-permission-user-picker--selected" : ""
                      }`}
                      aria-label={`选择用户 ${user.nickname || user.username}`}
                      onClick={() => setSelectedGrantUid(user.uid)}
                      disabled={isRootUser}
                    >
                      <div className="cv-permission-root-modal__identity">
                        <div className="cv-permission-item-title-row">
                          <strong>{user.nickname || user.username}</strong>
                          <span className="cv-permission-inline-chip">UID {user.uid}</span>
                        </div>
                        <div className="cv-muted">{user.email || "暂无邮箱"}</div>
                      </div>
                      <span className="cv-permission-root-modal__username">{user.username}</span>
                      <span className="cv-permission-root-modal__state">
                        {isRootUser ? "已授权" : isSelected ? "待授予" : "可授权"}
                      </span>
                      <span className="cv-permission-root-modal__action">
                        {isRootUser ? "不可选择" : isSelected ? "已选择" : "选择"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="未找到匹配用户" description="请尝试其他用户名或昵称关键字。" />
            )}

            <div className="cv-header-actions">
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setGrantModalOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="cv-action-button"
                disabled={!selectedGrantUid}
                onClick={handleGrantRoot}
              >
                确认授予
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </PermissionCenterLayout>
  );
}
