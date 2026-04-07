import { EmptyState } from "../state/PageState";

type DomainShellCardProps = {
  title: string;
  stage: string;
  summary: string;
  nextSteps: string[];
};

export default function DomainShellCard({
  title,
  stage,
  summary,
  nextSteps
}: DomainShellCardProps) {
  return (
    <section className="cv-domain-shell-card">
      <header className="cv-domain-shell-card__header">
        <h1>{title}</h1>
        <p>当前阶段：{stage}</p>
      </header>
      <EmptyState title="壳层已就绪" description={summary} />
      <section style={{ marginTop: 16 }}>
        <h2>下一步</h2>
        <ul className="cv-domain-shell-card__next-steps">
          {nextSteps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}
