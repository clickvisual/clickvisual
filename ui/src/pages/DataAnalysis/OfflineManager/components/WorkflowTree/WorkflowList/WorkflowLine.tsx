import { WorkflowInfo } from "@/services/bigDataWorkflow";
import { useIntl } from "umi";
import { Dropdown } from "antd";
import RightMenu from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/RightMenu";
import { OfflineRightMenuClickSourceEnums } from "@/pages/DataAnalysis/service/enums";
import { useRef } from "react";

const WorkflowLine = ({ workflow }: { workflow: WorkflowInfo }) => {
  const itemParentRef = useRef<HTMLDivElement>(null);
  const dataIntegrationParentRef = useRef<HTMLLIElement>(null);
  const dataDevelopmentParentRef = useRef<HTMLLIElement>(null);
  const i18n = useIntl();
  return (
    <li>
      <div ref={itemParentRef}>
        <Dropdown
          overlay={
            <RightMenu
              clickSource={OfflineRightMenuClickSourceEnums.workflowItem}
              currentWorkflow={workflow}
            />
          }
          trigger={["contextMenu"]}
          getPopupContainer={() => itemParentRef.current!}
        >
          <span>{workflow.name}</span>
        </Dropdown>
      </div>
      <ul>
        <li ref={dataIntegrationParentRef}>
          <Dropdown
            overlay={
              <RightMenu
                clickSource={OfflineRightMenuClickSourceEnums.dataIntegration}
                currentWorkflow={workflow}
              />
            }
            trigger={["contextMenu"]}
            getPopupContainer={() => dataIntegrationParentRef.current!}
          >
            <span>
              {i18n.formatMessage({ id: "bigdata.workflow.dataIntegration" })}
            </span>
          </Dropdown>
        </li>
        <li ref={dataDevelopmentParentRef}>
          <Dropdown
            overlay={
              <RightMenu
                clickSource={OfflineRightMenuClickSourceEnums.dataDevelopment}
                currentWorkflow={workflow}
              />
            }
            trigger={["contextMenu"]}
            getPopupContainer={() => dataDevelopmentParentRef.current!}
          >
            <span>
              {i18n.formatMessage({ id: "bigdata.workflow.dataDevelopment" })}
            </span>
          </Dropdown>
        </li>
      </ul>
    </li>
  );
};
export default WorkflowLine;
