import type { InstanceType } from "@/services/systemSetting";
import api from "@/services/systemSetting";
import useRequest from "@/hooks/useRequest/useRequest";
import { useState } from "react";
import { formatMessage } from "@@/plugin-locale/localeExports";
import { message } from "antd";
import { cloneDeep } from "lodash";

const Instances = () => {
  // 实例列表
  const [instanceList, setInstanceList] = useState<InstanceType[]>([]);
  // 当前选中实例，用于数据库筛选
  // const [selectedInstance, setSelectedInstance] = useState<
  //   number | undefined
  // >();

  // 当前选中表的iid
  const [currentlyTableToIid, setCurrentlyTableToIid] = useState<number>(0);

  // 树状展开项
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // 树状选中项
  const [selectKeys, setSelectKeys] = useState<any[]>([]);

  const onChangeCurrentlyTableToIid = (iid: number) => {
    setCurrentlyTableToIid(iid);
  };

  const onChangeExpandedKeys = (val: any) => {
    setExpandedKeys(val);
  };

  const onChangeSelectKeys = (arr: any) => {
    setSelectKeys(arr);
  };

  const doGetAllInstances = useRequest(api.getAllInstances, {
    loadingText: false,
  });

  const getInstanceList = useRequest(api.getInstances, {
    loadingText: false,
    onSuccess: (res) => setInstanceList(res.data),
  });

  const doGetInstanceInfo = useRequest(api.getInstancesInfo, {
    loadingText: false,
  });

  const doTestInstance = useRequest(api.testInstance, { loadingText: false });

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

  // const onChangeSelectedInstance = (instance: number | undefined) => {
  //   setSelectedInstance(instance);
  // };

  const doGetInstanceList = () => {
    getInstanceList.run();
  };

  // 三层循环查找替换 name版
  const filterSelectedTree = (list: any, val: string) => {
    let cloneInstanceList = list.filter((instanceItem: any) => {
      const cloneDatabase = instanceItem.children.filter(
        (databaseItem: any) => {
          const cloneTable = databaseItem.children.filter((tableItem: any) => {
            return tableItem.name.indexOf(val) != -1;
          });
          databaseItem.children = cloneTable;
          return cloneTable.length > 0;
        }
      );
      instanceItem.children = cloneDatabase;
      return cloneDatabase.length > 0;
    });

    // 展开所有的实例和数据库
    let keys: any = [];
    cloneInstanceList.map((item: any) => {
      keys.push(item.key);
      item.children.map((databaseItem: any) => {
        keys.push(databaseItem.key);
      });
    });
    onChangeExpandedKeys(keys);
    return cloneInstanceList;
  };

  // 三层循环查找替换 tid版
  const expandParent = (list: any[], tid: number) => {
    let cloneInstanceList = cloneDeep(list).filter((instanceItem: any) => {
      const cloneDatabase = instanceItem.children.filter(
        (databaseItem: any) => {
          const cloneTable = databaseItem.children.filter((tableItem: any) => {
            return tableItem.key == `table-${tid}`;
          });
          databaseItem.children = cloneTable;
          return cloneTable.length > 0;
        }
      );
      instanceItem.children = cloneDatabase;
      return cloneDatabase.length > 0;
    });

    // 展开所有的实例和数据库
    let keys: any = [];
    cloneInstanceList.map((item: any) => {
      keys.push(item.key);
      item.children.map((databaseItem: any) => {
        keys.push(databaseItem.key);
      });
    });
    onChangeExpandedKeys(keys);
  };

  return {
    instanceList,
    // selectedInstance,
    listLoading: getInstanceList.loading,
    doGetAllInstances,
    doGetInstanceList,
    doGetInstanceInfo,
    doTestInstance,
    doCreatedInstance,
    doUpdatedInstance,
    doDeletedInstance,
    getInstanceList,

    currentlyTableToIid,
    onChangeCurrentlyTableToIid,

    expandedKeys,
    onChangeExpandedKeys,

    filterSelectedTree,
    expandParent,

    selectKeys,
    onChangeSelectKeys,

    // onChangeSelectedInstance,
  };
};

export default Instances;
