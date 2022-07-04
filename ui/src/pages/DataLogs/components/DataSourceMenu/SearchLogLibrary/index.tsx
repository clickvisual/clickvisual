import searchLogLibraryStyles from "@/pages/DataLogs/components/DataSourceMenu/SearchLogLibrary/index.less";
import { Button, Input, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { PlusOutlined } from "@ant-design/icons";

type SearchLogLibraryProps = {
  onSearch: (val: string) => void;
};

const SearchLogLibrary = (props: SearchLogLibraryProps) => {
  const { onSearch } = props;
  const {
    currentDatabase,
    onChangeLogLibraryCreatedModalVisible,
    onChangeIsLogLibraryAllDatabase,
  } = useModel("dataLogs");
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
      <div className={searchLogLibraryStyles.space}>
        <Input.Search
          value={value}
          placeholder={i18n.formatMessage({
            id: "datasource.logLibrary.search.placeholder",
          })}
          allowClear
          style={{ paddingRight: "8px", flex: 1 }}
          onSearch={onSearch}
          onChange={(ev) => setValue(ev.target.value)}
        />
        <Tooltip
          title={i18n.formatMessage({
            id: "datasource.logLibrary.search.created",
          })}
          placement="right"
        >
          <Button
            disabled={!currentDatabase}
            onClick={() => {
              onChangeLogLibraryCreatedModalVisible(true);
              onChangeIsLogLibraryAllDatabase(true);
            }}
            type={"primary"}
            style={{ width: "32px" }}
            icon={<PlusOutlined />}
          />
        </Tooltip>
      </div>
    </div>
  );
};
export default SearchLogLibrary;
