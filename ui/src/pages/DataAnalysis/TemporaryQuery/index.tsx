import TemporaryQueryStyle from "@/pages/DataAnalysis/TemporaryQuery/index.less";
import FolderTree from "@/pages/DataAnalysis/components/FolderTree";
import SQLEditor from "@/pages/DataAnalysis/components/SQLEditor";

const TemporaryQuery = () => {
  return (
    <div className={TemporaryQueryStyle.queryMain}>
      <FolderTree />
      <SQLEditor />
    </div>
  );
};
export default TemporaryQuery;
