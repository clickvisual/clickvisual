import React, { CSSProperties } from 'react';
import styles from './index.less';

export enum ButtonType {
  Text = 'text',
  Default = 'default',
  Border = 'border',
}

export interface OptionButtonProps {
  onClick?: () => void;
  title?: string;
  style?: CSSProperties;
  type?: ButtonType;
  disabled?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function OptionButton(props: React.PropsWithChildren<OptionButtonProps>) {
  let buttonStyle = [styles.optionButton];
  switch (props.type) {
    case ButtonType.Text:
      buttonStyle = [...buttonStyle, styles.textBtn];
      break;
    case ButtonType.Border:
      buttonStyle = [...buttonStyle, styles.border];
      break;
    case ButtonType.Default:
    default:
      buttonStyle = [...buttonStyle, styles.defaultBtn];
  }

  if (props.disabled) {
    buttonStyle.push(styles.btnDisabled);
  }

  return (
    <button
      style={props.style}
      title={props.title}
      className={buttonStyle.join(' ')}
      onClick={props.onClick}
      disabled={props.disabled}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      {props.children}
    </button>
  );
}
