import { Fragment } from "react";

/**
 * `fmt` for sentences that carry links: replaces `{name}` placeholders with
 * React nodes, so each language can put the link wherever its word order
 * needs it. Unknown placeholders are left as written.
 */
export function rich(template: string, nodes: Record<string, React.ReactNode>): React.ReactNode {
  return template.split(/(\{\w+\})/).map((part, index) => {
    const key = part.slice(1, -1);
    const node = part.startsWith("{") && key in nodes ? nodes[key] : part;
    return <Fragment key={index}>{node}</Fragment>;
  });
}
