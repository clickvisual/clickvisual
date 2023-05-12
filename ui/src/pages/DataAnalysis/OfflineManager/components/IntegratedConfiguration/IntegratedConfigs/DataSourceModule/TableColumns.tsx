import CustomModal from "@/components/CustomModal";
import { OpenTypeEnums } from "@/models/dataanalysis/useIntegratedConfigs";
import { Button, Table } from "antd";
import { ColumnsType } from "antd/es/table";
import { useMemo } from "react";

export interface TableColumnsType {
  source: any;
  target: any;
  openVisible: boolean;
  setOpenVisible: (val: boolean) => void;
  openType: any;
  setOpenType: (val: OpenTypeEnums | undefined) => void;
  tableName: any;
  setTableName: (val: string | undefined) => void;
}

const TableColumns = ({
  source,
  target,
  openVisible,
  setOpenVisible,
  openType,
  setOpenType,
  tableName,
  setTableName,
}: TableColumnsType) => {
  const cancelModal = () => {
    setOpenType(undefined);
    setTableName(undefined);
    setOpenVisible(false);
  };

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
      open={openVisible}
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
