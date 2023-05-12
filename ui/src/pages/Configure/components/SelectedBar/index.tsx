import searchBarStyles from "@/pages/Configure/components/SelectedBar/index.less";
import { PlusOutlined } from "@ant-design/icons";
import { useModel } from "@umijs/max";
import { Button, Cascader, Select, Tooltip } from "antd";
import { useEffect } from "react";
import { useIntl } from "umi";

const { Option } = Select;

const SelectedBar = () => {
  const {
    options,
    clusters,
    doSelectedClusterId,
    selectedClusterId,
    selectedNameSpace,
    selectedConfigMap,
    doGetConfigMaps,
    onChangeConfigMaps,
    doSelectedNameSpace,
    doSelectedConfigMap,
    onChangeConfigContent,
    onChangeVisibleCreatedConfigMap,
    onChangeCurrentConfiguration,
  } = useModel("configure");
  const i18n = useIntl();

  useEffect(() => {
    if (selectedClusterId) {
      doGetConfigMaps(selectedClusterId);
    } else {
      onChangeConfigMaps([]);
      doSelectedNameSpace(undefined);
      doSelectedConfigMap(undefined);
    }
  }, [selectedClusterId]);

  const disabled = !selectedClusterId;

  const filter = (inputValue: string, path: any) => {
    return path.some(
      (option: any) =>
        option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
    );
  };
  return (
    <div className={searchBarStyles.selectedBar}>
      <Select
        placeholder={`${i18n.formatMessage({
          id: "config.selectedBar.cluster",
        })}`}
        showSearch
        value={selectedClusterId}
        className={searchBarStyles.selectedInput}
        onChange={(val) => {
          onChangeCurrentConfiguration(undefined);
          onChangeConfigContent("");
          doSelectedNameSpace(undefined);
          doSelectedConfigMap(undefined);
          doSelectedClusterId(val);
        }}
        allowClear
      >
        {clusters.map((item) => (
          <Option key={item.id} value={item.id as number}>
            {item.clusterName}
          </Option>
        ))}
      </Select>
      <Cascader
        value={
          selectedNameSpace && selectedConfigMap
            ? [selectedNameSpace, selectedConfigMap]
            : undefined
        }
        options={options}
        disabled={disabled}
        expandTrigger="hover"
        onChange={(value: any, selectedOptions: any) => {
          if (value.length === 2) {
            doSelectedNameSpace(value[0]);
            doSelectedConfigMap(value[1]);
          } else {
            doSelectedNameSpace(undefined);
            doSelectedConfigMap(undefined);
          }
          onChangeCurrentConfiguration(undefined);
          onChangeConfigContent("");
        }}
        placeholder={`${i18n.formatMessage({
          id: "config.selectedBar.configmap",
        })}`}
        showSearch={{ filter }}
        className={searchBarStyles.cascaderInput}
      />
      <Tooltip
        title={i18n.formatMessage({
          id: "config.selectedBar.button.tooltip",
        })}
      >
        <Button
          disabled={disabled}
          icon={<PlusOutlined />}
          type={"primary"}
          onClick={() => onChangeVisibleCreatedConfigMap(true)}
        >
          {i18n.formatMessage({ id: "config.selectedBar.button" })}
        </Button>
      </Tooltip>
      {selectedNameSpace && selectedConfigMap && (
        <div className={searchBarStyles.describe}>
          <span>
            {i18n.formatMessage(
              { id: "config.selectedBar.current" },
              { namespace: selectedNameSpace, configmap: selectedConfigMap }
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default SelectedBar;
