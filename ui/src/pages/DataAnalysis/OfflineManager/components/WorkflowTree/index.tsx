import CreatedAndEditorWorkflow from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/CreatedAndEditorWorkflow";
import useRightMenu from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/RightMenu";
import WorkflowList from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/WorkflowList";
import offlineStyles from "@/pages/DataAnalysis/OfflineManager/index.less";
import { OfflineRightMenuClickSourceEnums } from "@/pages/DataAnalysis/service/enums";
import { RightOutlined } from "@ant-design/icons";
import { useModel } from "@umijs/max";
import { Dropdown } from "antd";
import classNames from "classnames";
import { useEffect, useRef } from "react";
import { useIntl } from "umi";

const WorkflowTree = (props: {}) => {
  const i18n = useIntl();
  const { workflow, currentInstances } = useModel("dataAnalysis");
  const { isFold, setIsFold, getWorkflows, setWorkflowList } = workflow;
  const titleParentRef = useRef<HTMLDivElement>(null);

  const { items } = useRightMenu({
    clickSource: OfflineRightMenuClickSourceEnums.workflowHeader,
  });
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
            menu={{
              items: items,
            }}
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
