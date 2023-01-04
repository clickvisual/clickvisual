import {INSTANCEMANAGEMENT_PATH} from "@/config/config";
import {EditOutlined, PlusSquareOutlined} from "@ant-design/icons";
import {Button, message, Table, Tag, Tooltip} from "antd";
import {useEffect, useState} from "react";
import {useIntl, useModel} from "umi";
import EditEnvironmentModal from "./components/EditEnvironmentModal";
import type {InstanceType} from "@/services/systemSetting";
import CreateMetricsSamples from "./components/CreateMetricsSamples";

export interface ResGetAlarmConfigList {
  instanceId: number;
  isAlertManagerOK: number;
  isPrometheusOK: number;
  isMetricsSamplesOk: number;
  ruleStoreType: number;
  instanceName: string;
  prometheusTarget: string;
  checkPrometheusResult: string;
  checkAlertManagerResult: string;
  checkMetricsSamplesResult: any;
}

export enum RuleStoreType {
  notOpen = 0,
  file = 1,
  k8s = 2,
  operator = 3,
}

const Environment = () => {
  const {
    doGetAlarmConfigList,
    doGetInstanceList,
    doCreateMetricsSamplesTable,
  } = useModel("alarms.useAlarmEnvironment");
  const i18n = useIntl();
  const [visibleEnvironment, setVisibleEnvironment] = useState<boolean>(false);
  const [visibleMetricsSamples, setVisibleMetricsSamples] =
    useState<boolean>(false);
  const [currentIidAndIName, setCurrentIidAndIName] = useState<{
    iid: number;
    instanceName: string;
  }>({ iid: 0, instanceName: "" });
  const [editEnvironmentId, setEditEnvironmentId] = useState<number>(0);
  const [currentClusters, setCurrentClusters] = useState<string[]>([]);
  const [alarmConfigList, setAlarmConfigList] = useState<any[]>([]);
  const [instanceList, setInstanceList] = useState<InstanceType[]>([]);

  const column: any[] = [
    {
      title: i18n.formatMessage({ id: "instance.instanceName" }),
      dataIndex: "instanceName",
      align: "left",
      render: (instanceName: string) => {
        return (
          <Button type="link" href={INSTANCEMANAGEMENT_PATH} target="_blank">
            {instanceName}
          </Button>
        );
      },
    },
    {
      title: i18n.formatMessage({ id: "alarm.environment.form.ruleStoreType" }),
      dataIndex: "ruleStoreType",
      align: "left",
      render: (state: number) => {
        const stateList = {
          [RuleStoreType.notOpen]: (
            <Tag color="blue">
              {i18n.formatMessage({
                id: "alarm.environment.RuleStoreType.notOpen",
              })}
            </Tag>
          ),
          [RuleStoreType.k8s]: <Tag color="cyan">k8s</Tag>,
          [RuleStoreType.file]: (
            <Tag color="purple">
              {i18n.formatMessage({
                id: "alarm.environment.RuleStoreType.file",
              })}
            </Tag>
          ),
          [RuleStoreType.operator]: <Tag color="orange">operator</Tag>,
        };
        return stateList[state];
      },
    },
    {
      title: "Prometheus",
      dataIndex: "prometheusTarget",
      align: "left",
      render: (prometheusTarget: string) => {
        return (
          <Button type="link" href={prometheusTarget} target="_blank">
            {prometheusTarget}
          </Button>
        );
      },
    },
    {
      title: i18n.formatMessage({
        id: "alarm.environment.form.isPrometheusOK",
      }),
      dataIndex: "isPrometheusOK",
      align: "left",
      render: (state: number, record: ResGetAlarmConfigList) => {
        return (
          <>
            {state == 1 ? (
              <Tag color="success">
                {i18n.formatMessage({ id: "cluster.form.status.normality" })}
              </Tag>
            ) : (
              <>
                <Tag color="error">
                  {i18n.formatMessage({ id: "cluster.form.status.anomaly" })}
                </Tag>
                {record.checkPrometheusResult}
              </>
            )}
          </>
        );
      },
    },
    {
      title: i18n.formatMessage({
        id: "alarm.environment.form.isAlertManagerOK",
      }),
      dataIndex: "isAlertManagerOK",
      align: "left",
      render: (state: number, record: ResGetAlarmConfigList) => {
        return (
          <>
            {state == 1 ? (
              <Tag color="success">
                {i18n.formatMessage({ id: "cluster.form.status.normality" })}
              </Tag>
            ) : (
              <>
                <Tag color="error">
                  {i18n.formatMessage({ id: "cluster.form.status.anomaly" })}
                </Tag>
                {record.checkAlertManagerResult}
              </>
            )}
          </>
        );
      },
    },
    {
      title: i18n.formatMessage({
        id: "alarm.environment.form.isMetricsSamplesOk",
      }),
      dataIndex: "isMetricsSamplesOk",
      align: "left",
      render: (state: number, record: ResGetAlarmConfigList) => {
        return (
          <>
            {state == 1 ? (
              <Tag color="success">
                {i18n.formatMessage({ id: "cluster.form.status.normality" })}
              </Tag>
            ) : (
              <>
                <Tag color="error">
                  {i18n.formatMessage({ id: "cluster.form.status.anomaly" })}
                </Tag>
                {record.checkMetricsSamplesResult}
              </>
            )}
          </>
        );
      },
    },
    {
      title: "Options",
      key: "options",
      width: 100,
      align: "left",
      render: (_: any, record: ResGetAlarmConfigList) => (
        <>
          <Tooltip
            title={i18n.formatMessage({
              id: "edit",
            })}
          >
            <Button
              size={"small"}
              type={"link"}
              icon={<EditOutlined />}
              onClick={() => {
                setEditEnvironmentId(record.instanceId);
                setVisibleEnvironment(true);
              }}
            />
          </Tooltip>
          {record.isMetricsSamplesOk == 0 && (
            <Tooltip
              title={i18n.formatMessage(
                {
                  id: "create.name",
                },
                {
                  name: "metrics-samples",
                }
              )}
            >
              <Button
                size={"small"}
                type={"link"}
                icon={<PlusSquareOutlined />}
                onClick={() => {
                  const currentIid: InstanceType[] = instanceList.filter(
                    (item: InstanceType) => item.id == record.instanceId
                  );
                  const data = {
                    iid: record.instanceId,
                  };

                  const isHaveClusters =
                    currentIid.length > 0 &&
                    currentIid[0].clusters &&
                    currentIid[0].clusters.length > 0;
                  if (isHaveClusters) {
                    setCurrentIidAndIName({
                      iid: record.instanceId,
                      instanceName: record.instanceName,
                    });
                    setVisibleMetricsSamples(true);
                    setCurrentClusters(currentIid[0].clusters || []);
                  } else {
                    doCreateMetricsSamplesTable.run(data).then((res: any) => {
                      if (res.code != 0) return;
                      message.success("success");
                    });
                  }
                }}
              />
            </Tooltip>
          )}
        </>
      ),
    },
  ];

  const gitList = () => {
    doGetAlarmConfigList.run().then((res: any) => {
      if (res?.code != 0) return;
      setAlarmConfigList(res.data || []);
    });
  };

  const getInstanceList = () => {
    doGetInstanceList.run().then((res: any) => {
      if (res.code != 0) return;
      setInstanceList(res.data || []);
    });
  };

  useEffect(() => {
    gitList();
    getInstanceList();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <Table
        dataSource={alarmConfigList || []}
        columns={column}
        loading={doGetAlarmConfigList.loading}
        size="small"
        pagination={{ hideOnSinglePage: true }}
        rowKey={(item: any) => item.instanceId}
      />
      <EditEnvironmentModal
        editEnvironmentId={editEnvironmentId}
        visible={visibleEnvironment}
        onChangeVisible={setVisibleEnvironment}
        onGetList={gitList}
      />
      <CreateMetricsSamples
        visible={visibleMetricsSamples}
        onChangeVisible={setVisibleMetricsSamples}
        currentIidAndIName={currentIidAndIName}
        currentClusters={currentClusters}
        onGetList={gitList}
      />
    </div>
  );
};
export default Environment;
