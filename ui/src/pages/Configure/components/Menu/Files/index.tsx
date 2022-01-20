import fileStyles from "@/pages/Configure/components/Menu/Files/index.less";
import {
  DeleteOutlined,
  DiffOutlined,
  SyncOutlined,
  FileAddOutlined,
  FileSyncOutlined,
  HistoryOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import DarkButton from "@/pages/Configure/components/CustomButton/DarkButton";
import { Empty, Space, Spin, Tooltip } from "antd";
import TextButton from "@/pages/Configure/components/CustomButton/TextButton";
import IconFont from "@/components/IconFont";
import ActionButton from "@/pages/Configure/components/CustomButton/ActionButton";
import classNames from "classnames";
import { useModel } from "@@/plugin-model/useModel";
import DeletedModal from "@/components/DeletedModal";
import OnlineDiff from "@/pages/Configure/components/Menu/Files/OnlineDiff";
import { useState } from "react";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";

type FilesProps = {};
const Files = (props: FilesProps) => {
  const {
    configurationList,
    doGetConfigurations,
    doDeletedConfigurations,
    selectedConfigMap,
    selectedClusterId,
    selectedNameSpace,
    currentConfiguration,
    onChangeVisibleCreate,
    doGetConfiguration,
    onChangeCurrentConfiguration,
    onChangeVisibleHistory,
    doSynchronizingConfiguration,
  } = useModel("configure");

  const [visibleDiff, setVisibleDiff] = useState<boolean>(false);

  const doSync = useDebounceFn(
    () => {
      const params = {
        k8sConfigMapNameSpace: selectedNameSpace as string,
        k8sConfigMapName: selectedConfigMap as string,
      };
      doSynchronizingConfiguration
        .run({
          clusterId: selectedClusterId as number,
          ...params,
        })
        .then((res) => doGetConfigurations.run(params));
    },
    { wait: DEBOUNCE_WAIT }
  );

  if (!selectedConfigMap || !selectedNameSpace) {
    return (
      <div className={fileStyles.fileMain}>
        <div className={fileStyles.loading}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={""} />
          <div>Please select a cluster</div>
        </div>
      </div>
    );
  }

  return (
    <div className={fileStyles.fileMain}>
      {doGetConfigurations?.loading ? (
        <div className={fileStyles.loading}>
          <Spin />
          <div>loading</div>
        </div>
      ) : configurationList.length > 0 ? (
        <>
          <div className={fileStyles.actionContainer}>
            <Space>
              <Tooltip title="Create" placement="bottom">
                <ActionButton onClick={() => onChangeVisibleCreate(true)}>
                  <FileAddOutlined />
                </ActionButton>
              </Tooltip>
              <Tooltip title="Sync from K8S" placement="bottom">
                <ActionButton
                  onClick={() => {
                    if (!doSynchronizingConfiguration.loading) doSync.run();
                  }}
                >
                  <SyncOutlined />
                </ActionButton>
              </Tooltip>
              {currentConfiguration && (
                <>
                  <Tooltip title="Submit history" placement="bottom">
                    <ActionButton onClick={() => onChangeVisibleHistory(true)}>
                      <HistoryOutlined />
                    </ActionButton>
                  </Tooltip>
                  <Tooltip title="Online version comparison" placement="bottom">
                    <ActionButton onClick={() => setVisibleDiff(true)}>
                      <DiffOutlined />
                    </ActionButton>
                  </Tooltip>
                </>
              )}
            </Space>
          </div>
          <ul className={fileStyles.configList}>
            {configurationList.map((item) => (
              <li
                key={item.id}
                className={classNames(
                  currentConfiguration &&
                    currentConfiguration.id === item.id &&
                    fileStyles.active
                )}
                onClick={() => doGetConfiguration.run(item.id)}
              >
                <div className={fileStyles.configIcon}>
                  <IconFont type={"icon-file"} />
                </div>
                <div
                  className={fileStyles.configName}
                >{`${item.name}.${item.format}`}</div>
                <div className={fileStyles.configActions}>
                  <TextButton
                    onClick={(ev) => {
                      ev.stopPropagation();
                      DeletedModal({
                        onOk: () => {
                          doDeletedConfigurations(item.id).then((res) => {
                            if (res?.code === 0) {
                              doGetConfigurations.run({
                                k8sConfigMapNameSpace: selectedNameSpace,
                                k8sConfigMapName: selectedConfigMap,
                              });
                              onChangeCurrentConfiguration(undefined);
                            }
                          });
                        },
                        content: `Confirm :${item.name}.${item.format} ？This operation will also delete the relevant configuration files in the cluster configmap. Please operate with caution.`,
                      });
                    }}
                  >
                    <DeleteOutlined />
                  </TextButton>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className={fileStyles.noConfigMain}>
          <div className={fileStyles.title}>No Configs</div>
          <DarkButton onClick={() => onChangeVisibleCreate(true)}>
            <FileAddOutlined />
            <span className={fileStyles.btn}>Create</span>
          </DarkButton>
          <DarkButton
            style={{ marginTop: "12px" }}
            onClick={() => {
              if (!doSynchronizingConfiguration.loading) doSync.run();
            }}
          >
            {doSynchronizingConfiguration.loading ? (
              <LoadingOutlined />
            ) : (
              <FileSyncOutlined />
            )}
            <span className={fileStyles.btn}>Sync from K8S</span>
          </DarkButton>
        </div>
      )}
      <OnlineDiff
        visible={visibleDiff}
        onCancel={() => setVisibleDiff(false)}
      />
    </div>
  );
};
export default Files;
