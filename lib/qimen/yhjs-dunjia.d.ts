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
    star: VendorStarInfo | null;
    door: VendorDoorInfo | null;
    god: VendorGodInfo | null;
  };

  export type VendorBoard = {
    meta: {
      yinyang: '阳' | '阴';
      juNumber: number;
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
