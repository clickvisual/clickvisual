import type { InstanceType } from "@/services/systemSetting";
import api from "@/services/systemSetting";
import useRequest from "@/hooks/useRequest";
import { useState } from "react";
import type { InstanceSelectedType } from "@/services/dataLogs";

const Instances = () => {
  // 实例列表
  const [instanceList, setInstanceList] = useState<InstanceType[]>([]);
  // 当前选中实例，用于数据库筛选
  const [selectedInstance, setSelectedInstance] = useState<
    InstanceSelectedType | undefined
  >();

  const getInstanceList = useRequest(api.getInstances, {
    loadingText: false,
    onSuccess: (res) => setInstanceList(res.data),
  });

  const doCreatedInstance = useRequest(api.createdInstance, {
    loadingText: { done: "新增实例成功" },
  });

  const doUpdatedInstance = useRequest(api.updatedInstance, {
    loadingText: { done: "更新实例成功" },
  });

  const doDeletedInstance = useRequest(api.deletedInstance, {
    loadingText: { done: "删除实例成功" },
  });

  const onChangeSelectedInstance = (
    instance: InstanceSelectedType | undefined
  ) => {
    setSelectedInstance(instance);
  };

  const doGetInstanceList = () => {
    getInstanceList.run();
  };

  return {
    instanceList,
    selectedInstance,

    listLoading: getInstanceList.loading,
    doGetInstanceList,
    doCreatedInstance,
    doUpdatedInstance,
    doDeletedInstance,
    getInstanceList,

    onChangeSelectedInstance,
  };
};

export default Instances;
