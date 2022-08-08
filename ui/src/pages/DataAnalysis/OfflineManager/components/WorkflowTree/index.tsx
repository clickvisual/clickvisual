import offlineStyles from "@/pages/DataAnalysis/OfflineManager/index.less";
import { RightOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useRef } from "react";
import { Dropdown } from "antd";
import RightMenu from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/RightMenu";
import { OfflineRightMenuClickSourceEnums } from "@/pages/DataAnalysis/service/enums";
import CreatedAndEditorWorkflow from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/CreatedAndEditorWorkflow";
import { useIntl } from "umi";
import WorkflowList from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/WorkflowList";

const WorkflowTree = (props: {}) => {
  const i18n = useIntl();
  const { workflow, currentInstances } = useModel("dataAnalysis");
  const { isFold, setIsFold, getWorkflows, setWorkflowList } = workflow;
  const titleParentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentInstances) return;
    getWorkflows.run({ iid: currentInstances }).then((res) => {
      if (res?.code !== 0) return;
      setWorkflowList(res.data);
    });
  }, [currentInstances]);
  useEffect(() => {
    return () => setWorkflowList([]);
  }, []);

  return (
    <div className={offlineStyles.workflowMain}>
      <div className={offlineStyles.navTitle}>
        {i18n.formatMessage({
          id: "bigdata.components.RightMenu.Scheduling.secondary.dataMining",
        })}
      </div>
      <div className={offlineStyles.header}>
        <div className={offlineStyles.title} ref={titleParentRef}>
          <Dropdown
            overlay={
              <RightMenu
                clickSource={OfflineRightMenuClickSourceEnums.workflowHeader}
              />
            }
            trigger={["contextMenu"]}
            getPopupContainer={() => titleParentRef.current!}
          >
            <div onClick={() => setIsFold(() => !isFold)}>
              <RightOutlined
                className={classNames(
                  offlineStyles.icon,
                  !isFold && offlineStyles.iconExpand
                )}
              />
              <span>
                {i18n.formatMessage({ id: "bigdata.workflow.header.title" })}
              </span>
            </div>
          </Dropdown>
        </div>
      </div>
      {!isFold && <WorkflowList />}
      <CreatedAndEditorWorkflow />
    </div>
  );
};

export default WorkflowTree;
