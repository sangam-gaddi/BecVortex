import { VoraTool, VoraRole } from './types';
import { TOOL_REGISTRY } from './tools';

/** Return all tools accessible to the given role. */
export function getToolsForRole(role: VoraRole): VoraTool[] {
  return TOOL_REGISTRY.filter((t) => t.requiredRoles.includes(role));
}

/** Check whether a specific tool is accessible to a role. */
export function canUseTool(toolName: string, role: VoraRole): boolean {
  const tool = TOOL_REGISTRY.find((t) => t.name === toolName);
  return tool ? tool.requiredRoles.includes(role) : false;
}
