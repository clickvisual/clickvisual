import api from "@/services/systemSetting";
import useRequest from "@/hooks/useRequest/useRequest";
import { message } from "antd";
import { formatMessage } from "@@/plugin-locale/localeExports";
import { useState } from "react";
const Database = () => {
  const [visibleModal, setVisibleModal] = useState<boolean>(false);
  const [createDatabaseCurrentInstance, setCreateDatabaseCurrentInstance] =
    useState<number | undefined>();

  const createdDatabase = useRequest(api.createdDatabase, {
    loadingText: false,
    onSuccess() {
      message.success(formatMessage({ id: "database.success.created" }));
    },
  });

  const deletedDatabase = useRequest(api.deletedDatabase, {
    loadingText: false,
  });

  const doUpdatedDatabase = useRequest(api.updatedDatabase, {
    loadingText: false,
  });

  const onChangeCreatedDatabaseModal = (visible: boolean) => {
    setVisibleModal(visible);
  };

  const onChangeCreateDatabaseCurrentInstance = (iid: number | undefined) => {
    setCreateDatabaseCurrentInstance(iid);
  };

  return {
    createdDatabase,
    deletedDatabase,
    doUpdatedDatabase,
    visibleCreatedDatabaseModal: visibleModal,
    onChangeCreatedDatabaseModal,
    createDatabaseCurrentInstance,
    onChangeCreateDatabaseCurrentInstance,
  };
};
export default Database;
