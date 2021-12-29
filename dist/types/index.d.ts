declare const createLogConn: (props: {
    project: string;
    nameSpace: string;
    version?: number | undefined;
    maxLogCount?: number | undefined;
}) => {
    log: (label: string, value: any) => void;
    exportLog: (label: string, count?: number | undefined) => void;
};
export { createLogConn };
