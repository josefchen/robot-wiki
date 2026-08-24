const CONTACT_DECIMAL_PLACES = 3;
const CONTACT_DECIMAL_SCALE = 10 ** CONTACT_DECIMAL_PLACES;

type DecimalValue = number | string;

function decimalUnits(value: DecimalValue): number {
  const decimal = String(value);
  const match = /^(\d+)(?:\.(\d+))?$/.exec(decimal);
  if (!match || (match[2]?.length ?? 0) > CONTACT_DECIMAL_PLACES) {
    throw new Error(
      `Contact position ${decimal} must be a non-negative decimal with at most ${CONTACT_DECIMAL_PLACES} places`,
    );
  }

  const fraction = (match[2] ?? '').padEnd(CONTACT_DECIMAL_PLACES, '0');
  return Number.parseInt(match[1], 10) * CONTACT_DECIMAL_SCALE
    + Number.parseInt(fraction || '0', 10);
}

function formatUnits(units: number): {
  inputValue: string;
  readout: string;
} {
  const whole = Math.floor(units / CONTACT_DECIMAL_SCALE);
  const fraction = String(units % CONTACT_DECIMAL_SCALE).padStart(
    CONTACT_DECIMAL_PLACES,
    '0',
  );
  const readout = `${whole}.${fraction}`;

  return {
    inputValue: readout.replace(/(?:\.0+|(\.\d*?)0+)$/, '$1'),
    readout,
  };
}

export function contactGridIndex(
  value: DecimalValue,
  min: DecimalValue,
  step: DecimalValue,
): number {
  const offsetUnits = decimalUnits(value) - decimalUnits(min);
  const stepUnits = decimalUnits(step);

  if (offsetUnits < 0 || offsetUnits % stepUnits !== 0) {
    throw new Error(
      `Contact position ${value} is not on the ${step} grid from ${min}`,
    );
  }

  return offsetUnits / stepUnits;
}

export function offsetContactGridValue(
  value: DecimalValue,
  step: DecimalValue,
  gridSteps: number,
): {
  inputValue: string;
  readout: string;
} {
  return formatUnits(decimalUnits(value) + decimalUnits(step) * gridSteps);
}
