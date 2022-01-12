import { TooltipPlacement } from "antd/es/tooltip";
import { Tooltip } from "antd";

type TooltipRenderProps = {
  placement: TooltipPlacement | undefined;
};

const TooltipRender = (props: TooltipRenderProps) => {
  const { placement } = props;
  return (_: any) => (
    <Tooltip
      title={_}
      placement={placement}
      overlayInnerStyle={{ maxHeight: "200px", overflowY: "auto" }}
    >
      <span style={{ cursor: "default" }}>{_}</span>
    </Tooltip>
  );
};

export default TooltipRender;
