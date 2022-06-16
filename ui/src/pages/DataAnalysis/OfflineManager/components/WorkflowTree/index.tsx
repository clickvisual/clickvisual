import offlineStyles from "@/pages/DataAnalysis/OfflineManager/index.less";
import { RightOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useRef } from "react";
import { Dropdown } from "antd";
import RightMenu from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/RightMenu";
import { OfflineRightMenuClickSourceEnums } from "@/pages/DataAnalysis/service/enums";

const WorkflowTree = () => {
  const { workflow, currentInstances } = useModel("dataAnalysis");
  const { isFold, setIsFold, getWorkflows } = workflow;
  const titleParentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentInstances) return;
    getWorkflows.run({ iid: currentInstances });
  }, [currentInstances]);

  return (
    <div className={offlineStyles.workflowMain}>
      <div className={offlineStyles.header}>
        <div
          className={offlineStyles.title}
          onClick={() => setIsFold(() => !isFold)}
          ref={titleParentRef}
        >
          <Dropdown
            overlay={
              <RightMenu
                clickSource={OfflineRightMenuClickSourceEnums.workflow}
              />
            }
            trigger={["contextMenu"]}
            getPopupContainer={() => titleParentRef.current!}
          >
            <div>
              <RightOutlined
                className={classNames(
                  offlineStyles.icon,
                  !isFold && offlineStyles.iconExpand
                )}
              />
              <span>业务流程</span>
            </div>
          </Dropdown>
        </div>
      </div>
    </div>
  );
};

export default WorkflowTree;
