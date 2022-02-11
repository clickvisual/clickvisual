import type { InstanceType } from "@/services/systemSetting";
import api from "@/services/systemSetting";
import useRequest from "@/hooks/useRequest/useRequest";
import { useState } from "react";
import { formatMessage } from "@@/plugin-locale/localeExports";
import { message } from "antd";

const Instances = () => {
  // 实例列表
  const [instanceList, setInstanceList] = useState<InstanceType[]>([]);
  // 当前选中实例，用于数据库筛选
  const [selectedInstance, setSelectedInstance] = useState<
    number | undefined
  >();

  const getInstanceList = useRequest(api.getInstances, {
    loadingText: false,
    onSuccess: (res) => setInstanceList(res.data),
  });

  const doCreatedInstance = useRequest(api.createdInstance, {
    loadingText: false,
    onSuccess() {
      message.success(formatMessage({ id: "instance.success.created" }));
    },
  });

  const doUpdatedInstance = useRequest(api.updatedInstance, {
    loadingText: false,
    onSuccess() {
      message.success(formatMessage({ id: "instance.success.updated" }));
    },
  });

  const doDeletedInstance = useRequest(api.deletedInstance, {
    loadingText: false,
    onSuccess() {
      message.success(formatMessage({ id: "instance.success.deleted" }));
    },
  });

  const onChangeSelectedInstance = (instance: number | undefined) => {
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
