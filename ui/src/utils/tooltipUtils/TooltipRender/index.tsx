import { TooltipPlacement } from "antd/es/tooltip";
import { Tooltip } from "antd";
import clusterPanelStyles from "@/pages/SystemSetting/ClustersPanel/index.less";

type TooltipRenderProps = {
  placement: TooltipPlacement | undefined;
};

const TooltipRender = (props: TooltipRenderProps) => {
  const { placement } = props;
  return (_: any) => (
    <Tooltip title={_} placement={placement}>
      <span className={clusterPanelStyles.renderText}>{_}</span>
    </Tooltip>
  );
};

export default TooltipRender;
