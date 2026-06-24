import type { ReactNode } from "react";

type StateCardProps = {
  title: string;
  description?: string;
  role: "status" | "alert";
  actions?: ReactNode;
};

function StateCard({ title, description, role, actions }: StateCardProps) {
  return (
    <section
      role={role}
      aria-label={title}
      className="cv-page-state"
      data-tone={role === "alert" ? "error" : "default"}
    >
      <div>
        <p className="cv-page-state__eyebrow">
          {role === "alert" ? "Error State" : "Data State"}
        </p>
        <h2 className="cv-page-state__title">{title}</h2>
        {description ? (
          <p className="cv-page-state__description">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="cv-page-state__actions">{actions}</div> : null}
    </section>
  );
}

type CommonStateProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function LoadingState(props: CommonStateProps) {
  return <StateCard role="status" {...props} />;
}

export function EmptyState(props: CommonStateProps) {
  return <StateCard role="status" {...props} />;
}

export function ErrorState(props: CommonStateProps) {
  return <StateCard role="alert" {...props} />;
}
