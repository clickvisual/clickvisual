import api from "@/services/systemSetting";
import useRequest from "@/hooks/useRequest/useRequest";
import { message } from "antd";
import { formatMessage } from "@@/plugin-locale/localeExports";
import { useState } from "react";
const Database = () => {
  const [visibleModal, setVisibleModal] = useState<boolean>(false);

  const createdDatabase = useRequest(api.createdDatabase, {
    loadingText: false,
    onSuccess() {
      message.success(formatMessage({ id: "database.success.created" }));
    },
  });

  const onChangeCreatedDatabaseModal = (visible: boolean) => {
    setVisibleModal(visible);
  };

  return {
    createdDatabase,
    visibleCreatedDatabaseModal: visibleModal,
    onChangeCreatedDatabaseModal,
  };
};
export default Database;
