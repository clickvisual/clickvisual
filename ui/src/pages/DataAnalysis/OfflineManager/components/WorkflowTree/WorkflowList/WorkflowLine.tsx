import { WorkflowInfo } from "@/services/bigDataWorkflow";
import { useIntl } from "umi";
import { Dropdown } from "antd";
import RightMenu from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/RightMenu";
import { OfflineRightMenuClickSourceEnums } from "@/pages/DataAnalysis/service/enums";
import { useRef } from "react";
import CustomTree from "@/components/CustomTree";

const WorkflowLine = ({ workflow }: { workflow: WorkflowInfo }) => {
  const itemParentRef = useRef<HTMLDivElement>(null);
  const dataIntegrationParentRef = useRef<HTMLLIElement>(null);
  const dataDevelopmentParentRef = useRef<HTMLLIElement>(null);
  const i18n = useIntl();

  const treeData: any[] = [
    {
      title: "parent 1",
      ext: { json: "a" },
      key: "0-0",
      children: [
        {
          title: "parent 1-0",
          key: "0-0-0",
          children: [
            {
              title: "leaf",
              key: "0-0-0-0",
            },
            {
              title: "leaf",
              key: "0-0-0-1",
            },
            {
              title: "leaf",
              key: "0-0-0-2",
            },
          ],
        },
        {
          title: "parent 1-1",
          key: "0-0-1",
          children: [
            {
              title: "leaf",
              key: "0-0-1-0",
            },
          ],
        },
        {
          title: "parent 1-2",
          key: "0-0-2",
          children: [
            {
              title: "leaf",
              key: "0-0-2-0",
            },
            {
              title: "leaf",
              key: "0-0-2-1",
            },
          ],
        },
      ],
    },
  ];
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
          <CustomTree treeData={treeData} />
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
          <CustomTree treeData={treeData} />
        </li>
      </ul>
    </li>
  );
};
export default WorkflowLine;
