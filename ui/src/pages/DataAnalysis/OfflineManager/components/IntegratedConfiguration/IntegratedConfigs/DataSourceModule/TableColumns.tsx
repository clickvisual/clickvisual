import { Button, Table } from "antd";
import { ColumnsType } from "antd/es/table";
import { useModel } from "@@/plugin-model/useModel";
import { useMemo } from "react";
import { OpenTypeEnums } from "@/models/dataanalysis/useIntegratedConfigs";
import CustomModal from "@/components/CustomModal";

const TableColumns = () => {
  const { cancelModal, openVisible, openType, tableName, source, target } =
    useModel("dataAnalysis", (model) => ({
      openVisible: model.integratedConfigs.openVisible,
      tableName: model.integratedConfigs.tableName,
      openType: model.integratedConfigs.openType,
      cancelModal: model.integratedConfigs.cancelModal,
      source: model.integratedConfigs.sourceColumns,
      target: model.integratedConfigs.targetColumns,
    }));

  const title = useMemo(() => {
    if (openType && tableName) {
      return `${tableName} 表结构`;
    }
    return "";
  }, [openType, tableName]);

  const dataSource = useMemo(() => {
    switch (openType) {
      case OpenTypeEnums.source:
        return source;
      case OpenTypeEnums.target:
        return target;
      default:
        return [];
    }
  }, [openType, target, source]);

  const columns: ColumnsType<any> = [
    { title: "Field", dataIndex: "field" },
    { title: "Type", dataIndex: "type" },
  ];

  return (
    <CustomModal
      title={title}
      visible={openVisible}
      onCancel={cancelModal}
      width={700}
      footer={[
        <Button type={"primary"} onClick={cancelModal}>
          确定
        </Button>,
      ]}
    >
      <Table
        rowKey={"field"}
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        scroll={{ y: 400 }}
      />
    </CustomModal>
  );
};

export default TableColumns;
