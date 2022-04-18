type _CommonProps = {
  onClickValue?: (value: string, extra?: { key?: string }) => void;
  highLightValue?: { key: string; value: string }[] | undefined;
};
