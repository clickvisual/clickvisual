import CustomModal from "@/components/CustomModal";
import { useModel } from "@@/plugin-model/useModel";
import { EyeInvisibleOutlined } from "@ant-design/icons";
import { useDebounceFn } from "ahooks";
import { Button, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Key } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useIntl } from "umi";

const HiddenFieldModal = () => {
  const i18n = useIntl();
  const { currentLogLibrary, logOptionsHelper } = useModel("dataLogs");
  const { visibleHideField, getHideFields, updateFields, setVisibleHideField } =
    logOptionsHelper;

  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const handleCancel = () => {
    setVisibleHideField(false);
  };

  const hasSelected = useMemo(
    () => selectedRowKeys.length > 0,
    [selectedRowKeys]
  );

  const onSelectChange = useCallback((newSelectedRowKeys: Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  }, []);

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const columns: ColumnsType<any> = [
    {
      title: "Field",
      key: "field",
      width: "100%",
      align: "center",
    },
  ];

  // todo: 处理数据的逻辑并没有编写
  useEffect(() => {
    if (visibleHideField && currentLogLibrary) {
      getHideFields.run(currentLogLibrary.id).then((res: any) => {
        if (res?.code === 0) console.log("res: ", res.data);
      });
    }
  }, [visibleHideField, currentLogLibrary?.id]);

  useEffect(() => {
    if (!visibleHideField) {
      setSelectedRowKeys([]);
    }
  }, [visibleHideField]);
  return (
    <CustomModal
      title={"Hidden Fields"}
      width={700}
      onCancel={handleCancel}
      visible={visibleHideField}
    >
      <div style={{ height: 40 }}>
        <Button type={"primary"} disabled={!hasSelected}>
          {i18n.formatMessage({ id: "add" })}
        </Button>
        <span style={{ marginLeft: 8 }}>
          {hasSelected ? `Selected ${selectedRowKeys.length} items` : ""}
        </span>
      </div>
      <Table
        size={"small"}
        rowKey={"id"}
        columns={columns}
        dataSource={[]}
        rowSelection={{ ...rowSelection, type: "checkbox" }}
        pagination={false}
        scroll={{ y: 600 }}
        loading={getHideFields.loading}
      />
    </CustomModal>
  );
};

const HiddenFields = () => {
  const { logOptionsHelper } = useModel("dataLogs");
  const { visibleHideField, setVisibleHideField } = logOptionsHelper;

  const handleClick = useDebounceFn(
    () => {
      if (visibleHideField) return;
      setVisibleHideField(true);
    },
    { wait: 300 }
  ).run;

  return (
    <>
      <Tooltip title={"Hidden Fields"}>
        <Button
          type={"link"}
          icon={<EyeInvisibleOutlined />}
          onClick={handleClick}
        />
      </Tooltip>
      <HiddenFieldModal />
    </>
  );
};

export default HiddenFields;
