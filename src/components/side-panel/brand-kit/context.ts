import React from 'react';

// Base model interfaces are exported to allow consumers to augment (declaration merge)
// and extend them with additional fields if needed.
export interface Color {
  id: number;
  name: string;
  hex: string;
  createdAt: Date;
}

export interface Typography {
  id: number;
  name: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  createdAt: Date;
}

export interface Asset {
  id: number;
  name: string;
  url: string;
  createdAt: Date;
}

// Pagination types
export type PageRequest = {
  page: number; // 1-based
  pageSize: number;
  query?: string;
};

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  // compatibility with helpers that expect snake_case fields
  total_pages: number;
  page_size: number;
};

type WithOptional<T, K extends keyof T> =
  Omit<T, K> & Partial<Pick<T, K>>;

// Context interfaces are exported and generic so consumers can plug in their own models.
export interface ColorsContext<C extends Color = Color> {
  // pagination-friendly method
  listColors: (req: PageRequest) => Promise<PageResult<C>>;
  getColorById: (id: number) => Promise<C> | undefined;
  createColor: (color: WithOptional<C, 'id' | 'createdAt'>) => Promise<void>;
  updateColor: (color: WithOptional<C, 'id' | 'createdAt'>) => Promise<void>;
  deleteColor: (id: number) => Promise<void>;
}

export interface TypographyContext<T extends Typography = Typography> {
  listTypography: (req: PageRequest) => Promise<PageResult<T>>;
  getTypographyById: (id: number) => Promise<T> | undefined;
  createTypography: (typography: WithOptional<T, 'id' | 'createdAt'>) => Promise<void>;
  updateTypography: (typography: WithOptional<T, 'id' | 'createdAt'>) => Promise<void>;
  deleteTypography: (id: number) => Promise<void>;
}

export interface AssetsContext<A extends Asset = Asset> {
  listAssets: (req: PageRequest) => Promise<PageResult<A>>;
  getAssetById: (id: number) => Promise<A> | undefined;
  createAsset: (asset: WithOptional<A, 'id' | 'createdAt'>) => Promise<void>;
  updateAsset: (asset: WithOptional<A, 'id' | 'createdAt'>) => Promise<void>;
  deleteAsset: (id: number) => Promise<void>;
}

export interface BrandKitContextType<
  C extends Color = Color,
  T extends Typography = Typography,
  A extends Asset = Asset
> {
  colors: ColorsContext<C>;
  typography: TypographyContext<T>;
  assets: AssetsContext<A>;
}

export const BrandKitContext = React.createContext<BrandKitContextType | null>(null);

export const useBrandKit = () => {
  const context = React.useContext(BrandKitContext);
  if (!context) {
    throw new Error('useBrandKit must be used within a BrandKitProvider');
  }
  return context;
};