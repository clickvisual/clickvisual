import textBtnStyles from "@/pages/Configure/components/CustomButton/TextButton/index.less";
import type { HTMLAttributes } from "react";
import classNames from "classnames";

type TextButtonProps = HTMLAttributes<HTMLDivElement> & {};

const TextButton = (props: TextButtonProps) => {
  const { className, children, ...restProps } = props;

  return (
    <div
      className={classNames(textBtnStyles.textButton, className)}
      {...restProps}
    >
      {children}
    </div>
  );
};
export default TextButton;
