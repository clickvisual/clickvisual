type _CommonProps = {
  onClickValue?: (
    value: string,
    extra?: { key?: string; isIndex?: boolean; indexKey?: string }
  ) => void;
  highLightValue?: { key: string; value: string }[] | undefined;
  secondaryIndexKeys?: any[];
};
