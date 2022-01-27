import publishStyles from "./style.less";
import { Form, Modal, Select, Tag } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import moment from "moment";
import { useEffect, useState } from "react";

import DarkButton from "@/pages/Configure/components/CustomButton/DarkButton";
import { FIRST_PAGE } from "@/config/config";
import { HistoryConfigurationResponse } from "@/services/configure";
import RealtimeDiff from "@/pages/Configure/components/Menu/Publish/RealtimeDiff";
import classNames from "classnames";
import { useIntl } from "umi";

const { Option } = Select;

const Publish = () => {
  const [publishForm] = Form.useForm();
  const [visibleDiff, setVisibleDiff] = useState(false);
  const {
    configurationList,
    doGetHistoryConfiguration,
    doPublishConfiguration,
  } = useModel("configure");
  const [selectedVersion, setSelectedVersion] =
    useState<HistoryConfigurationResponse>();
  const i18n = useIntl();
  const handleChangeConfig = (configId: number) => {
    doGetHistoryConfiguration
      .run(configId, {
        current: FIRST_PAGE,
        pageSize: 10000,
      })
      .then((res) => {
        if (res?.code === 0) {
          publishForm.setFields([{ name: "version", value: undefined }]);
        }
      });
  };

  const handleFormSubmit = ({ version }: { version: string }) => {
    const selectedVer = doGetHistoryConfiguration.data?.find(
      (v) => v.version === version
    );
    if (!selectedVer) return;
    setSelectedVersion(selectedVer);
    setVisibleDiff(true);
  };

  const handleConfirm = () => {
    Modal.confirm({
      title: i18n.formatMessage({ id: "config.publish.confirm.title" }),
      content: i18n.formatMessage({ id: "config.publish.confirm.content" }),
      onOk() {
        if (selectedVersion)
          doPublishConfiguration
            .run(selectedVersion.configurationId, selectedVersion.version)
            .then((res) => {
              setVisibleDiff(false);
            });
      },
    });
  };

  useEffect(() => {
    return () => doGetHistoryConfiguration.reset();
  }, []);

  return (
    <div className={publishStyles.publishMain}>
      <Form
        className={publishStyles.publishForm}
        form={publishForm}
        onFinish={handleFormSubmit}
      >
        <div className={publishStyles.fieldLabel}>File</div>
        <Form.Item name="configId">
          <Select<number>
            className={classNames(
              publishStyles.formSelectInput,
              publishStyles.darkSelect
            )}
            dropdownClassName={publishStyles.darkSelectDropdown}
            placeholder={`${i18n.formatMessage({
              id: "config.publish.form.placeholder.configure",
            })}`}
            onSelect={(configId) => {
              handleChangeConfig(configId);
            }}
          >
            {configurationList?.map((config) => (
              <Option key={config.id} value={config.id}>
                {config.name}.{config.format}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <div className={publishStyles.fieldLabel}>Version</div>
        <Form.Item name="version">
          <Select
            placeholder={`${i18n.formatMessage({
              id: "config.publish.form.placeholder.version",
            })}`}
            className={classNames(
              publishStyles.formSelectInput,
              publishStyles.darkSelect
            )}
            dropdownClassName={publishStyles.darkSelectDropdown}
            optionLabelProp="label"
          >
            {doGetHistoryConfiguration.data?.map((config) => (
              <Option
                key={config.id}
                value={config.version}
                label={
                  <div className={publishStyles.versionSelectLabel}>
                    <div>
                      <Tag color="hsl(100,77%,44%)">
                        {config.version.substring(0, 7)}
                      </Tag>
                    </div>
                    <div className={publishStyles.changeLog}>
                      {config.changeLog}
                    </div>
                  </div>
                }
              >
                <div className={publishStyles.versionSelectInfo}>
                  <Tag color="hsl(100,77%,44%)">
                    {config.version.substring(0, 7)}
                  </Tag>
                  <div>
                    {moment(config.ctime, "X").format("YYYY-MM-DD HH:mm")}
                  </div>
                </div>
                <div className={publishStyles.changeLog}>
                  {config.changeLog}
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prev, next) => prev.version !== next.version}
        >
          {({ getFieldValue }) => {
            const version = getFieldValue("version");
            const configuration = doGetHistoryConfiguration.data?.find(
              (v) => v.version === version
            );
            if (!configuration) {
              return <></>;
            }

            return (
              <div className={publishStyles.configDetail}>
                <div className={publishStyles.fieldLabel}>
                  {i18n.formatMessage({
                    id: "config.publish.versionInfo.title",
                  })}
                </div>
                <div>
                  <span className={publishStyles.versionFieldLabel}>
                    Commit ID:
                  </span>
                  <span>{configuration.version}</span>
                </div>
                <div>
                  <span className={publishStyles.versionFieldLabel}>
                    Change Log:
                  </span>
                  <span>{configuration.changeLog}</span>
                </div>
                <div>
                  <span className={publishStyles.versionFieldLabel}>
                    {i18n.formatMessage({
                      id: "config.publish.versionInfo.time",
                    })}
                    :
                  </span>
                  {moment(configuration.ctime, "X").format(
                    "YYYY-MM-DD HH:mm:ss"
                  )}
                </div>
              </div>
            );
          }}
        </Form.Item>

        <div>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const configId = getFieldValue("configId");
              const version = getFieldValue("version");
              if (!configId)
                return (
                  <DarkButton disabled>
                    {i18n.formatMessage({
                      id: "config.publish.button.emptyFile",
                    })}
                  </DarkButton>
                );
              if (!version)
                return (
                  <DarkButton disabled>
                    {i18n.formatMessage({
                      id: "config.publish.button.emptyVersion",
                    })}
                  </DarkButton>
                );

              return (
                <DarkButton onClick={publishForm.submit}>
                  {i18n.formatMessage({ id: "config.publish.button" })}
                </DarkButton>
              );
            }}
          </Form.Item>
        </div>
      </Form>

      <RealtimeDiff
        visible={visibleDiff}
        configId={selectedVersion?.configurationId as number}
        version={selectedVersion?.version as string}
        onCancel={() => {
          setVisibleDiff(false);
        }}
        onOk={handleConfirm}
      />
    </div>
  );
};

export default Publish;
