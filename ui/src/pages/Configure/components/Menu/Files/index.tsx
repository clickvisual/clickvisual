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
import { Empty, message, Space, Spin, Tooltip } from "antd";
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
import { useIntl } from "umi";

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
  const i18n = useIntl();

  const doSync = useDebounceFn(
    () => {
      const hideMessage = message.loading({
        content: i18n.formatMessage({ id: "config.file.loading.sync" }),
        key: "sync",
      });
      const params = {
        k8sConfigMapNameSpace: selectedNameSpace as string,
        k8sConfigMapName: selectedConfigMap as string,
      };
      doSynchronizingConfiguration
        .run({
          clusterId: selectedClusterId as number,
          ...params,
        })
        .then((res) => {
          if (res?.code === 0) {
            message.success({
              content: i18n.formatMessage({
                id: "config.file.success.sync",
              }),
              key: "sync",
            });
            doGetConfigurations.run(params);
          } else {
            hideMessage();
          }
        })
        .catch(() => hideMessage());
    },
    { wait: DEBOUNCE_WAIT }
  );

  if (!selectedConfigMap || !selectedNameSpace) {
    return (
      <div className={fileStyles.fileMain}>
        <div className={fileStyles.loading}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={""} />
          <div>
            {i18n.formatMessage({ id: "config.files.select.empty.tip" })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={fileStyles.fileMain}>
      {doGetConfigurations?.loading ? (
        <div className={fileStyles.loading}>
          <Spin />
          <div>{i18n.formatMessage({ id: "spin" })}</div>
        </div>
      ) : configurationList.length > 0 ? (
        <>
          <div className={fileStyles.actionContainer}>
            <Space>
              <Tooltip
                title={i18n.formatMessage({
                  id: "config.files.tooltip.created",
                })}
                placement="bottom"
              >
                <ActionButton onClick={() => onChangeVisibleCreate(true)}>
                  <FileAddOutlined />
                </ActionButton>
              </Tooltip>
              <Tooltip
                title={i18n.formatMessage({
                  id: "config.files.sync",
                })}
                placement="bottom"
              >
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
                  <Tooltip
                    title={i18n.formatMessage({
                      id: "config.files.history",
                    })}
                    placement="bottom"
                  >
                    <ActionButton onClick={() => onChangeVisibleHistory(true)}>
                      <HistoryOutlined />
                    </ActionButton>
                  </Tooltip>
                  <Tooltip
                    title={i18n.formatMessage({
                      id: "config.files.tooltip.onlineDiff",
                    })}
                    placement="bottom"
                  >
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
                        content: `${i18n.formatMessage(
                          { id: "config.files.confirm.deleted" },
                          {
                            name: item.name,
                            format: item.format,
                          }
                        )}`,
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
          <div className={fileStyles.title}>
            {i18n.formatMessage({ id: "config.files.empty.tip" })}
          </div>
          <DarkButton onClick={() => onChangeVisibleCreate(true)}>
            <FileAddOutlined />
            <span className={fileStyles.btn}>
              {i18n.formatMessage({ id: "config.files.button.create" })}
            </span>
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
            <span className={fileStyles.btn}>
              {i18n.formatMessage({ id: "config.files.sync" })}
            </span>
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
