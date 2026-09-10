import { Fragment, type ReactNode } from "react";
import { useI18n } from "./I18nProvider";
import type { MessageKey } from "./messages";

/** Render a translated string, substituting `{name}` placeholders with React nodes. */
export function Trans({
  k,
  values,
}: {
  k: MessageKey;
  values?: Record<string, ReactNode>;
}) {
  const { t } = useI18n();
  const template = t(k);
  if (!values) return <>{template}</>;

  const nodes: ReactNode[] = [];
  const re = /\{(\w+)\}/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(template))) {
    if (match.index > last) {
      nodes.push(
        <Fragment key={i++}>{template.slice(last, match.index)}</Fragment>
      );
    }
    nodes.push(<Fragment key={i++}>{values[match[1]] ?? match[0]}</Fragment>);
    last = match.index + match[0].length;
  }
  if (last < template.length) {
    nodes.push(<Fragment key={i++}>{template.slice(last)}</Fragment>);
  }
  return <>{nodes}</>;
}
