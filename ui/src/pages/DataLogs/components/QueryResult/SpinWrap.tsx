import { ReactNode } from "react";
import queryResultStyles from "@/pages/DataLogs/components/QueryResult/index.less";
import { useIntl } from "umi";
import { Spin } from "antd";
import classNames from "classnames";

interface SpinWrapProps {
  children: ReactNode;
  loading: boolean;
  className?: string;
}
export const SpinWrap = ({ children, loading, className }: SpinWrapProps) => {
  const i18n = useIntl();
  return (
    <Spin
      spinning={loading}
      tip={i18n.formatMessage({ id: "spin" })}
      wrapperClassName={classNames(queryResultStyles.querySpinning, className)}
    >
      {children}
    </Spin>
  );
};
