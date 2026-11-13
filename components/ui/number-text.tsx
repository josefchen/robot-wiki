import { Children, Fragment, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

export const NUMERAL_RUN = /([−+-]?(?:\d+(?:[,.]\d+)*|\.\d+))/g;
export const NUMERAL_CLASS = 'font-mono tabular-nums'; // Geist Mono numerals are required by DI-TYPE-005.

/** Preserve the written value; use the data face only for its numeral runs. */
export function NumberText({ children }: { children: string | number }) {
  return String(children).split(NUMERAL_RUN).map((part, index) => index % 2
    ? <span key={index} data-numeral-run="" className={NUMERAL_CLASS}>{part}</span>
    : <Fragment key={index}>{part}</Fragment>);
}

/**
 * Decorate authored text without taking ownership of custom components,
 * code, or content whose DOM is managed outside React.
 */
export function numberText(value: ReactNode): ReactNode {
  if (typeof value === 'string' || typeof value === 'number') return <NumberText>{value}</NumberText>;
  if (Array.isArray(value)) return Children.map(value, numberText);
  if (isValidElement(value)) {
    const element = value as ReactElement<{ children?: ReactNode; dangerouslySetInnerHTML?: unknown }>;
    const nativeText = typeof element.type === 'string'
      && !['code', 'pre', 'kbd', 'samp', 'svg', 'math', 'script', 'style', 'textarea', 'select', 'option'].includes(element.type);
    if ((element.type === Fragment || nativeText) && !element.props.dangerouslySetInnerHTML) {
      return cloneElement(element, undefined, numberText(element.props.children));
    }
  }
  return value;
}

/** Numeric table cells also preserve links, annotations and unknowns. */
export { numberText as numericCellText };
