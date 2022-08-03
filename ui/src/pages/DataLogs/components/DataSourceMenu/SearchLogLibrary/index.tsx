import searchLogLibraryStyles from "@/pages/DataLogs/components/DataSourceMenu/SearchLogLibrary/index.less";
import CreatedDatabaseModal from "@/pages/DataLogs/components/SelectedDatabaseDraw/CreatedDatabaseModal";
import { Button, Input, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import { PlusOutlined } from "@ant-design/icons";
import IconFont from "@/components/IconFont";

type SearchLogLibraryProps = {
  onSearch: (val: string) => void;
  onGetList: any;
};

const SearchLogLibrary = (props: SearchLogLibraryProps) => {
  const { onSearch, onGetList } = props;
  const {
    // currentDatabase,
    onChangeLogLibraryCreatedModalVisible,
    onChangeIsLogLibraryAllDatabase,
    isHasDatabase,
  } = useModel("dataLogs");
  const { onChangeCreatedDatabaseModal } = useModel("database");
  const [value, setValue] = useState<string | undefined>(undefined);
  const i18n = useIntl();

  useEffect(() => {
    return () => {
      setValue(undefined);
    };
  }, []);

  // useEffect(() => {
  //   setValue(undefined);
  // }, [currentDatabase]);

  return (
    <div className={searchLogLibraryStyles.searchLogLibraryMain}>
      <div className={searchLogLibraryStyles.space}>
        <Input.Search
          value={value}
          placeholder={i18n.formatMessage({
            id: "datasource.logLibrary.search.placeholder",
          })}
          // allowClear
          style={{ paddingRight: "8px", flex: 1 }}
          onSearch={onSearch}
          onChange={(ev) => setValue(ev.target.value)}
        />
        {isHasDatabase ? (
          <Tooltip
            title={i18n.formatMessage({
              id: "datasource.logLibrary.search.created",
            })}
            placement="top"
          >
            <Button
              onClick={() => {
                onChangeLogLibraryCreatedModalVisible(true);
                onChangeIsLogLibraryAllDatabase(true);
              }}
              type={"primary"}
              style={{ width: "32px" }}
              icon={<PlusOutlined />}
            />
          </Tooltip>
        ) : null}
        <Tooltip
          title={i18n.formatMessage({
            id: "instance.operation.addDatabase",
          })}
          placement={"top"}
        >
          <Button
            onClick={() => {
              onChangeCreatedDatabaseModal(true);
            }}
            style={{ width: "32px", marginLeft: "8px" }}
            icon={
              <IconFont type={"icon-add-database"} style={{ color: "#fff" }} />
            }
          />
        </Tooltip>

        <CreatedDatabaseModal onGetList={onGetList} />
      </div>
    </div>
  );
};
export default SearchLogLibrary;
