declare module 'fontkit' {
  export type VariationAxis = {
    name: string;
    min: number;
    default: number;
    max: number;
  };

  export type Font = {
    type: string;
    familyName: string;
    subfamilyName: string;
    fullName: string;
    postscriptName: string;
    variationAxes: Record<string, VariationAxis>;
    characterSet: number[];
    hasGlyphForCodePoint(codePoint: number): boolean;
    'OS/2'?: {
      usWeightClass?: number;
      usWidthClass?: number;
    };
  };

  export function openSync(path: string): Font;
}
