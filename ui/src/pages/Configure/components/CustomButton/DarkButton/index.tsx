import darkBtnStyles from "@/pages/Configure/components/CustomButton/DarkButton/index.less";
import type { HTMLAttributes, ReactNode, CSSProperties } from "react";
import classNames from "classnames";

type DarkButtonProps = HTMLAttributes<any> & {
  children?: ReactNode;
  style?: CSSProperties;
  disabled?: boolean;
};
const DarkButton = (props: DarkButtonProps) => {
  const { children, className, disabled, onClick, ...restProps } = props;

  return (
    <div
      className={classNames(darkBtnStyles.darkButton, className, {
        [darkBtnStyles.disabled]: disabled,
      })}
      onClick={(ev) => {
        if (disabled) return;
        onClick?.(ev);
      }}
      {...restProps}
    >
      {children}
    </div>
  );
};

export default DarkButton;
