import FileTitle from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/FileTitle";
import IntegratedConfigs from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/IntegratedConfigs";
import CustomCollapse from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/CustomCollapse";
import { CustomCollapseEnums } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/config";
import { Form } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { DataSourceTypeEnums } from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration/config";
import message from "antd/es/message";
import { BigDataSourceType } from "@/services/bigDataWorkflow";

export interface IntegratedConfigurationProps {
  currentNode: any;
}
const IntegratedConfiguration = ({
  currentNode,
}: IntegratedConfigurationProps) => {
  const [form] = Form.useForm();
  const [nodeInfo, setNodeInfo] = useState<any>();
  const {
    setSource,
    setTarget,
    setMapping,
    mapping,
    updateNode,
    getNodeInfo,
    doLockNode,
    doUnLockNode,
    doRunCodeNode,
    doGetColumns,
  } = useModel("dataAnalysis", (model) => ({
    setSource: model.integratedConfigs.setSourceColumns,
    setTarget: model.integratedConfigs.setTargetColumns,
    mapping: model.integratedConfigs.mappingData,
    doGetColumns: model.integratedConfigs.doGetColumns,
    setMapping: model.integratedConfigs.setMappingData,
    updateNode: model.manageNode.doUpdatedNode,
    getNodeInfo: model.manageNode.doGetNodeInfo,
    doLockNode: model.manageNode.doLockNode,
    doUnLockNode: model.manageNode.doUnLockNode,
    doRunCodeNode: model.manageNode.doRunCodeNode,
  }));

  const handleSubmit = (fields: any) => {
    console.log("fields: ", fields);
    const sourceForm = fields.source;
    const targetForm = fields.target;
    const params = {
      source: {
        typ: DataSourceTypeEnums[sourceForm.type].toLowerCase(),
        sourceId: sourceForm.datasource,
        cluster: sourceForm.cluster,
        database: sourceForm.database,
        table: sourceForm.database,
        sourceFilter: sourceForm.sourceFilter,
      },
      target: {
        typ: DataSourceTypeEnums[targetForm.type].toLowerCase(),
        sourceId: targetForm.datasource,
        cluster: targetForm.cluster,
        database: targetForm.database,
        table: targetForm.database,
        targetBefore: targetForm.targetBefore,
        targetAfter: targetForm.targetAfter,
      },
      mapping,
    };
    updateNode
      .run(currentNode.id, {
        name: currentNode.name,
        content: JSON.stringify(params),
      })
      .then((res) => {
        if (res?.code !== 0) return;
        message.success("节点保存成功");
      });
  };

  const doGetNodeInfo = (id: number) => {
    getNodeInfo.run(id).then((res) => {
      if (res?.code !== 0) return;
      setNodeInfo(res.data);
      const formData = JSON.parse(res.data.content);
      const sourceType =
        formData.source?.type ===
        DataSourceTypeEnums[DataSourceTypeEnums.ClickHouse].toLowerCase()
          ? DataSourceTypeEnums.ClickHouse
          : DataSourceTypeEnums.MySQL;
      const targetType =
        formData.target?.type ===
        DataSourceTypeEnums[DataSourceTypeEnums.ClickHouse].toLowerCase()
          ? DataSourceTypeEnums.ClickHouse
          : DataSourceTypeEnums.MySQL;
      console.log("tag: ", {
        source: { ...formData.source, type: sourceType },
        target: { ...formData.target, type: targetType },
      });
      form.setFieldsValue({
        source: { ...formData.source, type: sourceType },
        target: { ...formData.target, type: targetType },
      });
      handleSetMapping(formData);
    });
  };

  const handleSetMapping = (formData: any) => {
    const source =
      formData.source?.typ ===
      DataSourceTypeEnums[DataSourceTypeEnums.ClickHouse].toLowerCase()
        ? {
            id: currentNode.iid,
            source: BigDataSourceType.instances,
            database: formData.source?.database,
            table: formData.source?.table,
          }
        : {
            id: formData.source?.datasource,
            source: BigDataSourceType.source,
            database: formData.source?.database,
            table: formData.source?.table,
          };

    const target =
      formData.target?.typ ===
      DataSourceTypeEnums[DataSourceTypeEnums.ClickHouse].toLowerCase()
        ? {
            id: currentNode.iid,
            source: BigDataSourceType.instances,
            database: formData.target?.database,
            table: formData.target?.table,
          }
        : {
            id: formData.target?.datasource,
            source: BigDataSourceType.source,
            database: formData.target?.database,
            table: formData.target?.table,
          };

    console.log("source.id: ", source.id, target.id);
    doGetColumns
      .run(source.id, source.source, {
        database: source.database,
        table: source.table,
      })
      .then((res: any) => {
        if (res?.code !== 0) return;
        setSource(res.data);
      });
    doGetColumns
      .run(target.id, target.source, {
        database: target.database,
        table: target.table,
      })
      .then((res: any) => {
        if (res?.code !== 0) return;
        setTarget(res.data);
      });
    setMapping(formData.mapping);
  };

  const handleSave = () => {
    form.submit();
  };
  const handleLock = (file: any) => {
    doLockNode.run(file.id).then((res: any) => {
      if (res.code !== 0) return;
      doGetNodeInfo(file.id);
    });
  };

  const handleUnlock = (file: any) => {
    doUnLockNode.run(file.id).then((res: any) => {
      if (res.code !== 0) return;
      doGetNodeInfo(file.id);
    });
  };

  const handleRun = (file: any) => {
    doRunCodeNode.run(file.id).then((res) => {
      if (res?.code !== 0) return;
      doGetNodeInfo(file.id);
    });
  };

  useEffect(() => {
    console.log("currentNode: ", currentNode);
    if (currentNode) doGetNodeInfo(currentNode.id);
    return () => {
      form.resetFields();
      setNodeInfo(undefined);
      setSource([]);
      setTarget([]);
      setMapping([]);
    };
  }, [currentNode]);

  const iid = useMemo(() => currentNode.iid, [currentNode.iid]);
  return (
    <div style={{ flex: 1, minHeight: 0 }}>
      <FileTitle
        file={nodeInfo}
        onSave={handleSave}
        onLock={handleLock}
        onUnlock={handleUnlock}
        onRun={handleRun}
      />
      <IntegratedConfigs
        onSubmit={handleSubmit}
        iid={iid}
        form={form}
        file={nodeInfo}
      />
    </div>
  );
};
export default IntegratedConfiguration;
