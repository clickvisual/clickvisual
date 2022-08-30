import CustomModal from "@/components/CustomModal";
import {useModel} from "@@/plugin-model/useModel";
import {EyeInvisibleOutlined} from "@ant-design/icons";
import {useDebounceFn} from "ahooks";
import {Button, Table, Tooltip} from "antd";
import type {ColumnsType} from "antd/es/table";
import type {Key} from "react";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useIntl} from "umi";
import {parseJsonObject} from "@/utils/string";
import {PaneType} from "@/models/datalogs/types";

const HiddenFieldModal = ({ oldPane }: { oldPane: PaneType | undefined }) => {
  const i18n = useIntl();
  const {
    logs,
    currentLogLibrary,
    visibleHideField,
    getHideFields,
    updateFields,
    setVisibleHideField,
    doGetLogsAndHighCharts,
    onChangeCurrentLogPane,
  } = useModel("dataLogs", (model) => ({
    logs: model.logs,
    doGetLogsAndHighCharts: model.doGetLogsAndHighCharts,
    currentLogLibrary: model.currentLogLibrary,
    visibleHideField: model.logOptionsHelper.visibleHideField,
    getHideFields: model.logOptionsHelper.getHideFields,
    updateFields: model.logOptionsHelper.updateFields,
    setVisibleHideField: model.logOptionsHelper.setVisibleHideField,
    logPanes: model.logPanesHelper.logPanes,
    onChangeCurrentLogPane: model.onChangeCurrentLogPane,
  }));
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const logKeys: any[] = useMemo(() => {
    if (!logs || logs.logs.length <= 0) {
      return [];
    }
    const log = logs.logs[0];
    let keys = Object.keys(log);

    const rawLogJson = parseJsonObject(log["_raw_log_"]);
    if (!rawLogJson) {
      return keys.map((item) => ({ field: item }));
    }
    keys = keys.filter((item) => item !== "_raw_log_");
    const rawLogKeys = Object.keys(rawLogJson).map((item) => {
      if (keys.includes(item)) {
        return `raw_log_${item}`;
      }
      return item;
    });

    return [...keys, ...rawLogKeys].map((item) => ({ field: item }));
  }, [logs]);

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
      dataIndex: "field",
      width: "100%",
      align: "center",
    },
  ];

  const handleSave = useCallback(() => {
    if (!currentLogLibrary || !currentLogLibrary.id) return;
    updateFields
      .run(currentLogLibrary.id, {
        fields: selectedRowKeys as string[],
      })
      .then((res) => {
        if (res?.code !== 0) return;
        handleCancel();
        doGetLogsAndHighCharts(currentLogLibrary.id, { isOnlyLog: true }).then(
          (res) => {
            if (!res) return;
            onChangeCurrentLogPane({
              ...(oldPane as PaneType),
              logs: res.logs,
            });
          }
        );
      });
  }, [currentLogLibrary, selectedRowKeys]);

  useEffect(() => {
    if (visibleHideField && currentLogLibrary && logs) {
      getHideFields.run(currentLogLibrary.id).then((res: any) => {
        if (res?.code === 0 && res?.data && res?.data.length > 0)
          setSelectedRowKeys([
            ...res.data,
            ...logs.hiddenFields.filter((item) => !res.data.includes(item)),
          ]);
      });
    }
  }, [visibleHideField, currentLogLibrary?.id, logs]);

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
        <Button
          type={"primary"}
          onClick={handleSave}
          loading={updateFields.loading}
        >
          {i18n.formatMessage({ id: "button.save" })}
        </Button>
        <span style={{ marginLeft: 8 }}>
          {hasSelected ? `已选择 ${selectedRowKeys.length} 个字段` : ""}
        </span>
      </div>
      <Table
        size={"small"}
        rowKey={"field"}
        columns={columns}
        dataSource={logKeys}
        rowSelection={{ ...rowSelection, type: "checkbox" }}
        pagination={false}
        scroll={{ y: 500 }}
        loading={getHideFields.loading}
      />
    </CustomModal>
  );
};

const HiddenFields = ({ oldPane }: { oldPane: PaneType | undefined }) => {
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
      <HiddenFieldModal oldPane={oldPane} />
    </>
  );
};

export default HiddenFields;
