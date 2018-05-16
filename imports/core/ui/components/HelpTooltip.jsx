import { Tooltip, Position } from "@blueprintjs/core";
import React from "react";

const HelpTooltip = ({ content }) => (
  <Tooltip
    content={<span className="help-tooltip">{content}</span>}
    position={Position.TOP}
  >
    <span className="pt-icon pt-icon-help help-tooltip-icon" />
  </Tooltip>
);

export default HelpTooltip;
