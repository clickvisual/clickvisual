import { Button, Input } from "antd";
import searchBarStyles from "@/pages/DataLogs/components/SearchBar/index.less";
import IconFont from "@/components/IconFont";
import { useIntl } from "umi";

const TableQuery = () => {
  const i18n = useIntl();

  return (
    <>
      <Input
        allowClear
        className={searchBarStyles.inputBox}
        placeholder={`${i18n.formatMessage({
          id: "log.search.placeholder",
        })}`}
      />
      <Button
        className={searchBarStyles.searchBtn}
        type="primary"
        icon={<IconFont type={"icon-log-search"} />}
      >
        {i18n.formatMessage({ id: "search" })}
      </Button>
    </>
  );
};
export default TableQuery;
