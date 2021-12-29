# idb-log

## Use indexedDB to storage log and trace bug

### Motivation

- Some bug can not easy to reproduce
- Local env is different from live env
- Other log system need backend support to keep persistence

### IndexedDB

- Support transaction
- Async so won't affect main js thread
- Key-value, but value can have structure

### Storage size?

- < Chrome67 : 50% of hardware
- &gt;= Chrome67: < 20％

```
  // The amount of the device's storage the browser attempts to
  // keep free. If there is less than this amount of storage free
  // on the device, Chrome will grant 0 quota to origins.
  //
  // Prior to M66, this was 10% of total storage instead of a fixed value on
  // all devices. Now the minimum of a fixed value (2GB) and 10% is used to
  // limit the reserve on devices with plenty of storage, but scale down for
  // devices with extremely limited storage.
  // *   1TB storage -- min(100GB,2GB) = 2GB
  // * 500GB storage -- min(50GB,2GB) = 2GB
  // *  64GB storage -- min(6GB,2GB) = 2GB
  // *  16GB storage -- min(1.6GB,2GB) = 1.6GB
  // *   8GB storage -- min(800MB,2GB) = 800MB
  const int64_t kShouldRemainAvailableFixed = 2048 * kMBytes;  // 2GB
  const double kShouldRemainAvailableRatio = 0.1;              // 10%
  // The amount of the device's storage the browser attempts to
  // keep free at all costs. Data will be aggressively evicted.
  //
  // Prior to M66, this was 1% of total storage instead of a fixed value on
  // all devices. Now the minimum of a fixed value (1GB) and 1% is used to
  // limit the reserve on devices with plenty of storage, but scale down for
  // devices with extremely limited storage.
  // *   1TB storage -- min(10GB,1GB) = 1GB
  // * 500GB storage -- min(5GB,1GB) = 1GB
  // *  64GB storage -- min(640MB,1GB) = 640MB
  // *  16GB storage -- min(160MB,1GB) = 160MB
  // *   8GB storage -- min(80MB,1GB) = 80MB
  const int64_t kMustRemainAvailableFixed = 1024 * kMBytes;  // 1GB
  const double kMustRemainAvailableRatio = 0.01;             // 1%

```

### Export function

```ts
const createLogConn = (props: {
  project: string;
  nameSpace: string;
  version?: number;
  maxLogCount?: number;
}): {
  log: (label: string, value: any) => void;
  exportLog: (label: string, count?: number) => void;
}


const downloadIdbLog = (project: string, nameSpace: string, label?: string) => void


const showIdbLog = (project: string, nameSpace: string, label?: string) => void

```

### Lib function

```ts
const readWithLabel: (props: {
  db: IDBDatabase;
  dbTableName: string;
  label?: string;
  keepValueObject?: boolean;
  callback: (list: ExportItem[]) => void;
}) => void;


const logExport = (
  db: IDBDatabase,
  dbTableName: string,
  label?: string,
  count?: number
) => void


const addLog = (props: {
  db: IDBDatabase;
  dbTableName: string;
  label: string;
  value: any;
  max: number;
  project: string;
}) => void


const removeDb = (
  project: string,
  db?: IDBDatabase,
  callbackDBRemoved?: () => void
) => void


const openDb = (
  project: string,
  callbackDBReady: (db: IDBDatabase) => void
) => void


const removeByID = (db: IDBDatabase, dbTableName: string, id: number) => void


const deleteWhenOverAmount = (
  db: IDBDatabase,
  dbTableName: string,
  max: number
) => void
```

### Relative link

- https://www.ruanyifeng.com/blog/2018/07/indexeddb.html
- https://www.zhangxinxu.com/wordpress/2017/07/html5-indexeddb-js-example/
- https://segmentfault.com/a/1190000018429380


### NPM

- https://www.npmjs.com/package/idb-log