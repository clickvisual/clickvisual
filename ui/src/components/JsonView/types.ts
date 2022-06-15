type _CommonProps = {
  onClickValue?: (
    value: string,
    extra?: { key?: string; isIndex?: boolean; indexKey?: string }
  ) => void;
  onInsertExclusion?: (
    value: string,
    extra?: { key?: string; isIndex?: boolean; indexKey?: string }
  ) => void;
  quickInsertLikeExclusion?: (
    value: string,
    extra?: { key?: string; isIndex?: boolean; indexKey?: string }
  ) => void;
  highLightValue?: { key: string; value: string }[] | undefined;
  secondaryIndexKeys?: any[];
  foldingChecked?: boolean;
};
