import useRequest from "@/hooks/useRequest/useRequest";
import { DataSourceReqTypEnums } from "@/pages/DataAnalysis/service/enums";
import dataSourceManageApi, {
  SourceInfoType,
} from "@/services/dataSourceManage";
import { useState } from "react";

const useDataSourceManage = () => {
  const [currentTyp, setCurrentTyp] = useState<number>(0);
  const [sourceList, setSourceList] = useState<SourceInfoType[]>([]);
  const [isUpdate, setIsUpdate] = useState<boolean>(false);
  const [visibleDataSource, setVisibleDataSource] = useState<boolean>(false);
  const [currentDataSource, setCurrentDataSource] = useState<SourceInfoType>();

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

  // Source
  const doGetSourceList = useRequest(dataSourceManageApi.getSourceList, {
    loadingText: false,
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

  const onSearch = () => {
    doGetSourceList.run({ typ: currentTyp }).then((res: any) => {
      if (res.code == 0) {
        setSourceList(res.data);
      }
    });
  };

  const onCreate = () => {};

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

    typList,

    onSearch,
    onCreate,

    doGetSourceList,
    doCreateSource,
    doDeleteSource,
    doUpdateSource,
    doGetSourceInfo,
  };
};
export default useDataSourceManage;
