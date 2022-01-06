import actionBtnStyles from "@/pages/Configure/components/CustomButton/ActionButton/index.less";
import type { HTMLAttributes } from "react";
import classNames from "classnames";

type ActionButtonProps = HTMLAttributes<HTMLDivElement> & {};

export default function ActionButton(props: ActionButtonProps) {
  const { className, children, ...restProps } = props;
  return (
    <div
      className={classNames(actionBtnStyles.actionButton, className)}
      {...restProps}
    >
      {children}
    </div>
  );
}
