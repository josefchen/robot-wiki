/**
 * Chart primitives for static figures on the graphite stage. Nothing here
 * uses client-only APIs, so server-rendered figures and client instruments
 * draw with the same parts.
 */
export { ChartAxes, ChartSvg, type PlotRect } from './chart-axes';
export {
  Bar,
  ConstraintHatch,
  DirectLabel,
  LineTrace,
  PointMarker,
  StageAnnotation,
  UncertaintyBand,
  type ChartPoint,
} from './chart-marks';
export {
  ChartLegend,
  LegendSwatch,
  SmallMultiples,
  smallMultiplesLayout,
  type LegendMark,
} from './chart-layout';
export {
  CHART_HATCH,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  CHART_VIEW_WIDTH,
  linearScale,
  roleColour,
  type ChartRole,
} from './chart-tokens';
