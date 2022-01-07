import searchBarStyles from "@/pages/Configure/components/SelectedBar/index.less";
import { Button, Cascader, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";

const { Option } = Select;

type SelectedBarProps = {};
const SelectedBar = (props: SelectedBarProps) => {
  const {
    clusters,
    doSelectedClusterId,
    selectedClusterId,
    selectedNameSpace,
    selectedConfigMap,
    doGetConfigMaps,
    configMaps,
    onChangeConfigMaps,
    doSelectedNameSpace,
    doSelectedConfigMap,
  } = useModel("configure");

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

  const options =
    configMaps.map((item) => {
      const children = [];
      if (item.configmaps.length > 0) {
        for (const child of item.configmaps) {
          children.push({
            value: child.configmapName,
            label: child.configmapName,
          });
        }
      }
      return {
        value: item.namespace,
        label: item.namespace,
        disabled: !(children.length > 0),
        children: children,
      };
    }) || [];

  const filter = (inputValue: string, path: any) => {
    return path.some(
      (option: any) =>
        option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
    );
  };
  return (
    <div className={searchBarStyles.selectedBar}>
      <Select
        placeholder="请选择集群"
        showSearch
        value={selectedClusterId}
        className={searchBarStyles.selectedInput}
        onChange={doSelectedClusterId}
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
        onChange={(value: any, selectedOptions: any) => {
          console.log("val: ", value, selectedOptions);
          if (value.length === 2) {
            doSelectedNameSpace(value[0]);
            doSelectedConfigMap(value[1]);
          } else {
            doSelectedNameSpace(undefined);
            doSelectedConfigMap(undefined);
          }
        }}
        placeholder="请选择配置中心"
        showSearch={{ filter }}
        className={searchBarStyles.cascaderInput}
      />
      <Button disabled={disabled} icon={<PlusOutlined />} type={"primary"}>
        新增
      </Button>
    </div>
  );
};

export default SelectedBar;
