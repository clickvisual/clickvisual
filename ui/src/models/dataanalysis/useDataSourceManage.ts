import useRequest from "@/hooks/useRequest/useRequest";
import { DataSourceReqTypEnums } from "@/pages/DataAnalysis/service/enums";
import dataSourceManageApi, {
  SourceInfoType,
} from "@/services/dataSourceManage";
import { useRef, useState } from "react";
import Request, { Canceler } from "umi-request";

const useDataSourceManage = () => {
  const [currentTyp, setCurrentTyp] = useState<number>();
  const [sourceList, setSourceList] = useState<SourceInfoType[]>([]);
  const [isUpdate, setIsUpdate] = useState<boolean>(false);
  const [visibleDataSource, setVisibleDataSource] = useState<boolean>(false);
  const [currentDataSource, setCurrentDataSource] = useState<SourceInfoType>();

  const cancelTokenTargetListRef = useRef<Canceler | null>(null);
  const cancelTokenSourceListRef = useRef<Canceler | null>(null);

  const typList = [
    {
      value: DataSourceReqTypEnums.mysql,
      title: "mysql",
    },
  ];

  const changeCurrentTyp = (num: number) => {
    setCurrentTyp(num);
  };

  const changeVisibleDataSource = (flag: boolean) => {
    setVisibleDataSource(flag);
  };

  const changeIsUpdate = (flag: boolean) => {
    setIsUpdate(flag);
  };

  const changeCurrentDataSource = (value: SourceInfoType | undefined) => {
    setCurrentDataSource(value);
  };

  const changeSourceList = (value: any) => {
    setSourceList(value);
  };

  // doGetSources: model.integratedConfigs.doGetSources,
  //   doGetSqlSource: model.dataSourceManage.doGetSourceList,
  //   doGetSourceTable: model.integratedConfigs.doGetSourceTables,
  //   doGetColumns: model.integratedConfigs.doGetColumns,

  // Source
  const doGetSourceList = useRequest(dataSourceManageApi.getSourceList, {
    loadingText: false,
    onError: (e) => {
      if (Request.isCancel(e)) {
        return false;
      }
      return;
    },
  });

  const doCreateSource = useRequest(dataSourceManageApi.createSource, {
    loadingText: false,
  });

  const doDeleteSource = useRequest(dataSourceManageApi.deleteSource, {
    loadingText: false,
  });

  const doUpdateSource = useRequest(dataSourceManageApi.updateSource, {
    loadingText: false,
  });

  const doGetSourceInfo = useRequest(dataSourceManageApi.getSourceInfo, {
    loadingText: false,
  });

  const onSearch = (iid: number, file?: { typ: number }) => {
    doGetSourceList
      .run({ iid: iid as number, typ: file?.typ as number })
      .then((res: any) => {
        if (res.code == 0) {
          changeSourceList(res.data);
        }
      });
  };

  return {
    currentTyp,
    changeCurrentTyp,

    visibleDataSource,
    changeVisibleDataSource,

    isUpdate,
    changeIsUpdate,

    currentDataSource,
    changeCurrentDataSource,

    sourceList,
    changeSourceList,

    onSearch,

    typList,

    doGetSourceList,
    doCreateSource,
    doDeleteSource,
    doUpdateSource,
    doGetSourceInfo,

    cancelTokenTargetListRef,
    cancelTokenSourceListRef,
  };
};
export default useDataSourceManage;
