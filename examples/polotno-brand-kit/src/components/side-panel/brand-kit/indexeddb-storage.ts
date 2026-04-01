import {
  Asset,
  AssetsContext,
  BrandKitContextType,
  Color,
  ColorsContext,
  PageRequest,
  PageResult,
  Typography,
  TypographyContext
} from './context';

// Default IndexedDB-backed implementation for BrandKit contexts.

export type BrandKitIndexedDbOptions = {
  dbName?: string;
  version?: number;
  storeNames?: {
    colors?: string;
    typography?: string;
    assets?: string;
  };
};

const DEFAULT_OPTIONS: Required<BrandKitIndexedDbOptions> = {
  dbName: 'BrandKitDB',
  version: 3,
  storeNames: {
    colors: 'colors',
    typography: 'typography',
    assets: 'assets',
  },
};

function openDb(opts: Required<BrandKitIndexedDbOptions>): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }
    const request = indexedDB.open(opts.dbName, opts.version);
    request.onupgradeneeded = () => {
      const db = request.result;
      const { colors, typography, assets } = opts.storeNames;
      if (!db.objectStoreNames.contains(colors)) {
        db.createObjectStore(colors, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(typography)) {
        db.createObjectStore(typography, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(assets)) {
        db.createObjectStore(assets, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open error'));
  });
}

function readAll<T = any>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function create<T = any>(db: IDBDatabase, storeName: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.add(value as any);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function put<T = any>(db: IDBDatabase, storeName: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value as any);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function del(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function findById<T = any>(db: IDBDatabase, storeName: string, id: number): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function paginateFromIndexedDB<T = any>(
  items: T[], 
  req: PageRequest, 
  filter?: (item: T) => boolean
): PageResult<T> {
  const { page, pageSize, query } = req;
  const filtered = filter ? items.filter(filter) : items;
  const total = filtered.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const end = start + pageSize;
  const paginatedItems = filtered.slice(start, end);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasMore = page < totalPages;
  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    totalPages,
    hasMore,
    total_pages: totalPages,
    page_size: pageSize,
  };
}

export function createIndexedDbBrandKitContext<
  C extends Color = Color,
  T extends Typography = Typography,
  A extends Asset = Asset
>(options?: BrandKitIndexedDbOptions): BrandKitContextType<C, T, A> {
  const opts: Required<BrandKitIndexedDbOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
    storeNames: { ...DEFAULT_OPTIONS.storeNames, ...(options?.storeNames ?? {}) },
  } as Required<BrandKitIndexedDbOptions>;
  
  const colorsCtx: ColorsContext<C> = {
    listColors: async (req: PageRequest) => {
      try {
        const db = await openDb(opts);
        const allColors = await readAll<C>(db, opts.storeNames.colors);
        const q = (req.query ?? '').toLowerCase().trim();
        const filtered = allColors.filter((c: any) => 
          !q || (c.name?.toLowerCase?.().includes(q) || c.hex?.toLowerCase?.().includes(q))
        );
        return paginateFromIndexedDB<C>(filtered, req);
      } catch (e) {
        console.warn('BrandKit: failed to read colors from IndexedDB', e);
        return paginateFromIndexedDB<C>([], req);
      }
    },
    getColorById: async (id: number) => {
      try {
        const db = await openDb(opts);
        return findById(db, opts.storeNames.colors, id);
      } catch (e) {
        console.warn('BrandKit: failed to read color from IndexedDB', e);
      }
    },
    createColor: async (color: C) => {
      try {
        const db = await openDb(opts);
        await create<C>(db, opts.storeNames.colors, { ...color, createdAt: new Date() });
      } catch (e) {
        console.warn('BrandKit: failed to create color', e);
      }
    },
    updateColor: async (color: C) => {
      try {
        const db = await openDb(opts);
        await put<C>(db, opts.storeNames.colors, color);
      } catch (e) {
        console.warn('BrandKit: failed to update color', e);
      }
    },
    deleteColor: async (id: number) => {
      try {
        const db = await openDb(opts);
        await del(db, opts.storeNames.colors, id);
      } catch (e) {
        console.warn('BrandKit: failed to delete color', e);
      }
    },
  };

  const typographyCtx: TypographyContext<T> = {
    listTypography: async (req: PageRequest) => {
      try {
        const db = await openDb(opts);
        const allTypography = await readAll<T>(db, opts.storeNames.typography);
        const q = (req.query ?? '').toLowerCase().trim();
        const filtered = allTypography.filter((t: any) =>
          !q ||
          t.name?.toLowerCase?.().includes(q) ||
          t.fontFamily?.toLowerCase?.().includes(q)
        );
        return paginateFromIndexedDB<T>(filtered, req);
      } catch (e) {
        console.warn('BrandKit: failed to read typography from IndexedDB', e);
        return paginateFromIndexedDB<T>([], req);
      }
    },
    getTypographyById: async (id: number) => {
      try {
        const db = await openDb(opts);
        return findById(db, opts.storeNames.typography, id);
      } catch (e) {
        console.warn('BrandKit: failed to read typography from IndexedDB', e);
      }
    },
    createTypography: async (item: T) => {
      try {
        const db = await openDb(opts);
        await create<T>(db, opts.storeNames.typography, { ...item, createdAt: new Date() });
      } catch (e) {
        console.warn('BrandKit: failed to create typography', e);
      }
    },
    updateTypography: async (item: T) => {
      try {
        const db = await openDb(opts);
        await put<T>(db, opts.storeNames.typography, item);
      } catch (e) {
        console.warn('BrandKit: failed to update typography', e);
      }
    },
    deleteTypography: async (id: number) => {
      try {
        const db = await openDb(opts);
        await del(db, opts.storeNames.typography, id);
      } catch (e) {
        console.warn('BrandKit: failed to delete typography', e);
      }
    },
  };

  const assetsCtx: AssetsContext<A> = {
    listAssets: async (req: PageRequest) => {
      try {
        const db = await openDb(opts);
        const allAssets = await readAll<A>(db, opts.storeNames.assets);
        const q = (req.query ?? '').toLowerCase().trim();
        const filtered = allAssets.filter((a: any) => !q || a.name?.toLowerCase?.().includes(q));
        return paginateFromIndexedDB<A>(filtered, req);
      } catch (e) {
        console.warn('BrandKit: failed to read assets from IndexedDB', e);
        return paginateFromIndexedDB<A>([], req);
      }
    },
    getAssetById: async (id: number) => {
      try {
        const db = await openDb(opts);
        return findById(db, opts.storeNames.assets, id);
      } catch (e) {
        console.warn('BrandKit: failed to read asset from IndexedDB', e);
      }
    },
    createAsset: async (item: A) => {
      try {
        const db = await openDb(opts);
        await create<A>(db, opts.storeNames.assets, { ...item, createdAt: new Date() });
      } catch (e) {
        console.warn('BrandKit: failed to create asset', e);
      }
    },
    updateAsset: async (item: A) => {
      try {
        const db = await openDb(opts);
        await put<A>(db, opts.storeNames.assets, item);
      } catch (e) {
        console.warn('BrandKit: failed to update asset', e);
      }
    },
    deleteAsset: async (id: number) => {
      try {
        const db = await openDb(opts);
        await del(db, opts.storeNames.assets, id);
      } catch (e) {
        console.warn('BrandKit: failed to delete asset', e);
      }
    },
  };

  return {
    colors: colorsCtx,
    typography: typographyCtx,
    assets: assetsCtx,
  };
}
