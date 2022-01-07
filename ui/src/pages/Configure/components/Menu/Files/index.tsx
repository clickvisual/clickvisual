import fileStyles from "@/pages/Configure/components/Menu/Files/index.less";
import {
  DeleteOutlined,
  FileAddOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import DarkButton from "@/pages/Configure/components/CustomButton/DarkButton";
import { Empty, Space, Spin, Tooltip } from "antd";
import TextButton from "@/pages/Configure/components/CustomButton/TextButton";
import IconFont from "@/components/IconFont";
import ActionButton from "@/pages/Configure/components/CustomButton/ActionButton";
import classNames from "classnames";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import DeletedModal from "@/components/DeletedModal";

type FilesProps = {};
const Files = (props: FilesProps) => {
  const {
    configurationList,
    onChangeConfigurations,
    doGetConfigurations,
    doDeletedConfigurations,
    selectedConfigMap,
    selectedNameSpace,
    currentConfiguration,
    onChangeVisibleCreate,
    doGetConfiguration,
  } = useModel("configure");

  useEffect(() => {
    if (selectedConfigMap && selectedNameSpace) {
      doGetConfigurations.run({
        k8sConfigMapNameSpace: selectedNameSpace,
        k8sConfigMapName: selectedConfigMap,
      });
    } else {
      onChangeConfigurations([]);
    }
  }, [selectedConfigMap, selectedNameSpace]);
  if (!selectedConfigMap || !selectedNameSpace) {
    return (
      <div className={fileStyles.fileMain}>
        <div className={fileStyles.loading}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={""} />
          <div>请先选择集群空间</div>
        </div>
      </div>
    );
  }
  return (
    <div className={fileStyles.fileMain}>
      {doGetConfigurations?.loading ? (
        <div className={fileStyles.loading}>
          <Spin />
          <div>加载中</div>
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
                <Tooltip title="提交历史" placement="bottom">
                  <ActionButton>
                    <HistoryOutlined />
                  </ActionButton>
                </Tooltip>
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
                          doDeletedConfigurations(item.id);
                          doGetConfigurations.run({
                            k8sConfigMapNameSpace: selectedNameSpace,
                            k8sConfigMapName: selectedConfigMap,
                          });
                        },
                        content: `确认删除配置文件：${item.name}.${item.format} 吗？`,
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
        </div>
      )}
    </div>
  );
};
export default Files;
