import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import FolderTree from "@/pages/DataAnalysis/TemporaryQuery/components/FolderTree";
import SQLEditor from "@/pages/DataAnalysis/TemporaryQuery/components/SQLEditor";

const TemporaryQuery = () => {
  return (
    <div className={TemporaryQueryStyle.queryMain}>
      <FolderTree />
      <SQLEditor />
    </div>
  );
};
export default TemporaryQuery;
