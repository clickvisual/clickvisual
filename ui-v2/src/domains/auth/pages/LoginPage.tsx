import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { loginWithPassword } from "../api/login";
import { buildV2RouteHref } from "../../../shared/layout/VersionSwitcher";

function normalizeRedirect(value: string | null) {
  if (!value || /^https?:\/\//i.test(value)) {
    return buildV2RouteHref("query");
  }
  if (value.startsWith("/v2")) {
    return value;
  }
  return buildV2RouteHref("query");
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = useMemo(() => normalizeRedirect(searchParams.get("redirect")), [searchParams]);
  const [username, setUsername] = useState("clickvisual");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);
    try {
      await loginWithPassword(username.trim(), password);
      window.location.assign(redirectTo);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="cv-login-page">
      <section className="cv-login-panel" aria-labelledby="cv-login-title">
        <div className="cv-login-panel__brand">
          <span className="cv-login-panel__mark" aria-hidden="true">
            CV
          </span>
          <div>
            <h1 id="cv-login-title">ClickVisual v2</h1>
            <p>私有化日志查询</p>
          </div>
        </div>

        <form className="cv-login-form" onSubmit={handleSubmit}>
          <label className="cv-login-field">
            <span>用户名</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>
          <label className="cv-login-field">
            <span>密码</span>
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoFocus
            />
          </label>
          {errorMessage ? <p className="cv-login-error">{errorMessage}</p> : null}
          <button className="cv-action-button cv-login-submit" type="submit" disabled={submitting}>
            {submitting ? "登录中..." : "登录"}
          </button>
        </form>
      </section>
    </main>
  );
}
