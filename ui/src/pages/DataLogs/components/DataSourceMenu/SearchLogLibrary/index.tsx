import searchLogLibraryStyles from "@/pages/DataLogs/components/DataSourceMenu/SearchLogLibrary/index.less";
import { Button, Input, Space, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { PlusOutlined } from "@ant-design/icons";
import ModalCreatedLogLibrary from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary";

type SearchLogLibraryProps = {
  onSearch: (val: string) => void;
};

const SearchLogLibrary = (props: SearchLogLibraryProps) => {
  const { onSearch } = props;
  const { currentDatabase, onChangeLogLibraryCreatedModalVisible } =
    useModel("dataLogs");
  const [value, setValue] = useState<string | undefined>(undefined);
  const i18n = useIntl();

  useEffect(() => {
    return () => {
      setValue(undefined);
    };
  }, []);

  useEffect(() => {
    setValue(undefined);
  }, [currentDatabase]);

  return (
    <div className={searchLogLibraryStyles.searchLogLibraryMain}>
      <Space>
        <Input.Search
          value={value}
          placeholder={i18n.formatMessage({
            id: "datasource.logLibrary.search.placeholder",
          })}
          allowClear
          onSearch={onSearch}
          onChange={(ev) => setValue(ev.target.value)}
        />
        <Tooltip
          title={i18n.formatMessage({
            id: "datasource.logLibrary.search.created",
          })}
        >
          <Button
            disabled={!currentDatabase}
            onClick={() => onChangeLogLibraryCreatedModalVisible(true)}
            type={"primary"}
            icon={<PlusOutlined />}
          />
        </Tooltip>
        <ModalCreatedLogLibrary />
      </Space>
    </div>
  );
};
export default SearchLogLibrary;
