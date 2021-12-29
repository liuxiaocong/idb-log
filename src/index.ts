// @ts-ignore
import ExportJsonExcel from "js-export-excel";

type ExportItem = {
  time: string;
  label: string;
  value: string;
};

const pendingLog = [];

const getTimeDisplay = (
  timeStamp: number | undefined | null | string,
  format?: string
): string => {
  if (!timeStamp) {
    return "";
  }
  let date;
  let time = timeStamp;
  if (typeof timeStamp === "string") {
    try {
      date = new Date(time);
    } catch (ex) {
      return "";
    }
  } else {
    date = new Date(time);
  }
  if (!date) {
    return "";
  }
  //'yyyy-MM-dd hh:mm:ss'
  let result = format || "yyyy-MM-dd hh:mm";
  const keyMap: { [key: string]: any } = {
    "M+": date.getMonth() + 1, //month
    "d+": date.getDate(), //date
    "h+": date.getHours(), //hour
    "m+": date.getMinutes(), //min
    "s+": date.getSeconds(), //second
  };
  if (/(y+)/.test(result)) {
    result = result.replace(
      RegExp.$1,
      (date.getFullYear() + "").substring(4 - RegExp.$1.length)
    );
  }
  for (const k in keyMap) {
    if (new RegExp("(" + k + ")").test(result)) {
      result = result.replace(
        RegExp.$1,
        RegExp.$1.length == 1
          ? keyMap[k]
          : ("00" + keyMap[k]).substring(("" + keyMap[k]).length)
      );
    }
  }
  return result;
};

const readWithLabel = (props: {
  db: IDBDatabase;
  dbTableName: string;
  label?: string;
  keepValueObject?: boolean;
  callback: (list: ExportItem[]) => void;
}) => {
  const { db, dbTableName, label, callback, keepValueObject } = props;
  const objectStore = db.transaction(dbTableName).objectStore(dbTableName);
  const listData: ExportItem[] = [];
  objectStore.openCursor().onsuccess = function (event: any) {
    let cursor = event?.target?.result;
    if (cursor) {
      const data = cursor.value;
      if (!label || label === data.label) {
        listData.push({
          label: data.label,
          time: data.time,
          value: !!keepValueObject
            ? data.value
            : typeof data.value === "object"
            ? JSON.stringify(data.value)
            : `${data.value}`,
        });
      }
      cursor.continue();
    } else {
      callback(listData);
    }
  };
};

const logExport = (
  db: IDBDatabase,
  dbTableName: string,
  label?: string,
  count?: number
) => {
  var option: any = {};

  option.fileName = `db-log-${label}-${getTimeDisplay(
    new Date().getTime(),
    "yyyy-MM-dd"
  )}`;
  const sheetData: any[] = [];
  const sheetHeader: string[] = ["Label", "Time", "Log Info"];
  const columnWidths: any[] = [];
  readWithLabel({
    db,
    dbTableName,
    label,
    callback: (list) => {
      if (list && list.length > 0) {
        Object.keys(list[0]).forEach((key) => {
          columnWidths.push(10);
        });
        sheetData.push(...list);
      }
      option.datas = [
        {
          sheetData,
          sheetName: "data",
          sheetHeader,
          columnWidths,
        },
      ];

      var toExcel = new ExportJsonExcel(option);
      toExcel.saveExcel();
    },
  });
};

const addLog = (props: {
  db: IDBDatabase;
  dbTableName: string;
  label: string;
  value: any;
  max: number;
  project: string;
}) => {
  const { db, dbTableName, label, value, max, project } = props;
  if (!db) {
    //console.error("please init first");
    pendingLog.push({
      label,
      value,
      time: new Date().toLocaleString(),
    });
    return;
  }

  const transaction = db.transaction([dbTableName], "readwrite");

  const add = transaction.objectStore(dbTableName).add({
    label,
    value,
    time: new Date().toLocaleString(),
  });
  add.onsuccess = function (event) {
    deleteWhenOverAmount(db, dbTableName, max);
  };

  add.onerror = function (event) {
    //console.log("data write fail");
  };
  transaction.onabort = function (event: any) {
    event.stopPropagation();
    if (event.target.error && event.target.error.name == "QuotaExceededError") {
      // Encountered disk full while committing transaction.
      // An attempt was made to add something to storage that exceeded the quota
      removeDb(project, db, undefined);
    }
  };
};

const removeDb = (
  project: string,
  db?: IDBDatabase,
  callbackDBRemoved?: () => void
) => {
  db && db.close();
  const request = window.indexedDB.deleteDatabase(project);
  request.onerror = function (event: any) {
    // 1. Internal error opening backing store for indexedDB.deleteDatabase.
    // 2. Internal error deleting database.
    return console.error("clean_error", event.target.error); // 每天200+
  };
  request.onsuccess = function (event) {
    callbackDBRemoved && callbackDBRemoved();
  };
};

const openDb = (props: {
  project: string;
  callbackDBReady: (db: IDBDatabase, canCreateTable?: boolean) => void;
  needCreateNewTable?: boolean;
}) => {
  const { project, callbackDBReady, needCreateNewTable } = props;
  const request = needCreateNewTable
    ? window.indexedDB.open(project, new Date().getTime())
    : window.indexedDB.open(project);
  request.onerror = function (event: any) {
    console.error("IndexedDB open error");
    if (event.target.error && event.target.error.name == "QuotaExceededError") {
      //remove db
      removeDb(project, undefined, () => {
        //only try one time
        const secondTimeRequest = window.indexedDB.open(project);
        secondTimeRequest.onsuccess = function (event) {
          const db = request.result;
          callbackDBReady(db);
        };
        secondTimeRequest.onupgradeneeded = function (event: any) {
          const db = event.target?.result;
          callbackDBReady(db);
        };
      });
    }
  };
  request.onsuccess = function (event) {
    const db = request.result;
    callbackDBReady(db);
  };

  //unable to using evant: IDBVersionChangeEvent
  request.onupgradeneeded = function (event: any) {
    const db = event.target?.result;
    callbackDBReady(db, true);
  };
};

const downloadIdbLog = (project: string, nameSpace: string, label?: string) => {
  const dbTableName: string = `${nameSpace}_log`;
  openDb({
    project,
    callbackDBReady: (db: IDBDatabase) => {
      logExport(db, dbTableName, label);
    },
  });
};

const showIdbLog = (project: string, nameSpace: string, label?: string) => {
  const dbTableName: string = `${nameSpace}_log`;
  openDb({
    project,
    callbackDBReady: (db: IDBDatabase) => {
      readWithLabel({
        db,
        dbTableName,
        label,
        keepValueObject: true,
        callback: (list) => {
          console.log(JSON.stringify(list));
        },
      });
    },
  });
};

const removeByID = (db: IDBDatabase, dbTableName: string, id: number) => {
  const request = db
    .transaction([dbTableName], "readwrite")
    .objectStore(dbTableName)
    .delete(id);

  request.onsuccess = function (event) {};
};
const deleteWhenOverAmount = (
  db: IDBDatabase,
  dbTableName: string,
  max: number
) => {
  const dbTable = db.transaction([dbTableName]).objectStore(dbTableName);
  const request = dbTable.getAll();
  request.onsuccess = function (event: any) {
    const logObjectArray = event.target.result;
    if (logObjectArray && logObjectArray.length > max) {
      let removeCount = logObjectArray.length - max + Math.floor(max / 10); //keep 10% buffer
      if (removeCount > logObjectArray.length) {
        removeCount = logObjectArray.length;
      }
      for (let i = 0; i < removeCount; i++) {
        const item = logObjectArray[i];
        removeByID(db, dbTableName, item.id);
      }
    }
  };
};

const createLogConn = (props: {
  project: string;
  nameSpace: string;
  version?: number;
  maxLogCount?: number;
}): {
  log: (label: string, value: any) => void;
  exportLog: (label: string, count?: number) => void;
} => {
  const { project, nameSpace, version, maxLogCount } = props;
  const max = maxLogCount || 2000;
  let db: IDBDatabase;
  const dbTableName: string = `${nameSpace}_log`;

  const detectDb = () => {
    if (!db) {
      console.error("db fail to open");
      return false;
    }
    return true;
  };
  openDb({
    project,
    needCreateNewTable: true,
    callbackDBReady: (dbConn: IDBDatabase, canCreateTable?: boolean) => {
      db = dbConn;
      if (!canCreateTable) {
        return;
      }

      if (!db.objectStoreNames.contains(dbTableName)) {
        const objectStore = db.createObjectStore(dbTableName, {
          autoIncrement: true,
          keyPath: "id",
        });
        objectStore.createIndex("label", "label");
        objectStore.createIndex("value", "value");
      }
    },
  });
  return {
    log: (label: string, value: any) => {
      if (detectDb()) {
        addLog({ db, dbTableName, label, value, max, project });
      }
    },
    exportLog: (label: string, count?: number) => {
      if (detectDb()) {
        logExport(db, dbTableName, label, count);
      }
    },
  };
};

// @ts-ignore
window.downloadIdbLog = downloadIdbLog;
// @ts-ignore
window.showIdbLog = showIdbLog;

export { createLogConn };
