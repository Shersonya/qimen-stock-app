declare module '@yhjs/dunjia' {
  export type VendorBoardType = 'hour' | 'day' | 'month' | 'year' | 'minute';

  export type VendorStarInfo = {
    name: string;
    originPalace: number;
  };

  export type VendorDoorInfo = {
    name: string;
    originPalace: number;
  };

  export type VendorGodInfo = {
    name: string;
  };

  export type VendorPalace = {
    index: number;
    position: number;
    name: string | null;
    groundGan: string | null;
    groundExtraGan: string | null;
    skyGan: string | null;
    skyExtraGan: string | null;
    star: VendorStarInfo | null;
    door: VendorDoorInfo | null;
    god: VendorGodInfo | null;
    outGan: string | null;
    outExtraGan: string | null;
    outerGods: VendorGodInfo[];
  };

  export type VendorBoard = {
    meta: {
      type: VendorBoardType;
      datetime: Date;
      yinyang: '阳' | '阴';
      juNumber: number;
      xunHead: string;
      xunHeadGan: string;
      ganZhi: string;
      solarTerm: string;
      moveStarOffset: number;
    };
    palaces: VendorPalace[];
    palace(index: number): VendorPalace;
  };

  export const TimeDunjia: {
    create(input: {
      datetime: Date;
      type?: VendorBoardType;
    }): VendorBoard;
  };
}
