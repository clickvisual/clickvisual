import { INSTANCEMANAGEMENT_PATH } from "@/config/config";
import { EditOutlined } from "@ant-design/icons";
import { Button, Table, Tag, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { useIntl, useModel } from "umi";
import EditEnvironmentModal from "./components/EditEnvironmentModal";

export interface ResGetAlarmConfigList {
  instanceId: number;
  isAlertManagerOK: number;
  isPrometheusOK: number;
  ruleStoreType: number;
  instanceName: string;
  prometheusTarget: string;
  checkPrometheusResult: string;
  checkAlertManagerResult: string;
}

export enum RuleStoreType {
  notOpen = 0,
  file = 1,
  k8s = 2,
}

const Environment = () => {
  const { doGetAlarmConfigList } = useModel("alarms.useAlarmEnvironment");
  const i18n = useIntl();

  const [visibleEnvironment, setVisibleEnvironment] = useState<boolean>(false);
  const [editEnvironmentId, setEditEnvironmentId] = useState<number>(0);
  const [alarmConfigList, setAlarmConfigList] = useState<any[]>([]);

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
      title: "Options",
      key: "options",
      width: 100,
      align: "left",
      render: (_: any, record: ResGetAlarmConfigList) => (
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
      ),
    },
  ];

  const gitList = () => {
    doGetAlarmConfigList.run().then((res: any) => {
      if (res?.code != 0) return;
      setAlarmConfigList(res.data || []);
    });
  };

  useEffect(() => {
    gitList();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <Table
        dataSource={alarmConfigList || []}
        columns={column}
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
    </div>
  );
};
export default Environment;
