import fileStyles from "@/pages/Configure/components/Menu/Files/index.less";
import {
  DeleteOutlined,
  DiffOutlined,
  FileAddOutlined,
  FileSyncOutlined,
  HistoryOutlined,
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
              <Tooltip title="新建配置" placement="bottom">
                <ActionButton onClick={() => onChangeVisibleCreate(true)}>
                  <FileAddOutlined />
                </ActionButton>
              </Tooltip>
              {currentConfiguration && (
                <>
                  <Tooltip title="提交历史" placement="bottom">
                    <ActionButton onClick={() => onChangeVisibleHistory(true)}>
                      <HistoryOutlined />
                    </ActionButton>
                  </Tooltip>
                  <Tooltip title="线上版本对比" placement="bottom">
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
                  <IconFont type={"icon-json"} />
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
                        content: `确认删除配置文件：${item.name}.${item.format} 吗？该操作会同时删除集群 configmap 内相关配置文件，请谨慎操作。`,
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
          <div className={fileStyles.title}>没有配置文件</div>
          <DarkButton onClick={() => onChangeVisibleCreate(true)}>
            <FileAddOutlined />
            <span className={fileStyles.btn}>新建配置</span>
          </DarkButton>
          <DarkButton
            style={{ marginTop: "12px" }}
            onClick={() => doSync.run()}
          >
            <FileSyncOutlined />
            <span className={fileStyles.btn}>快速同步集群配置</span>
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
