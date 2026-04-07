import type { ReactNode } from "react";

type ShellSectionProps = {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
};

export default function ShellSection({
  title,
  description,
  aside,
  children
}: ShellSectionProps) {
  return (
    <section className="cv-shared-section">
      <header className="cv-shared-section__header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}
