"use client";

import { useCallback, useState } from "react";

const logService = {
  info: (message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`, data || "");
  }
};

export const useAdminLogs = () => {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string, data?: unknown) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs((prev) => [logMessage, ...prev.slice(0, 49)]);
    logService.info(message, data);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    logService.info("Logs limpiados");
  }, []);

  const downloadLogs = useCallback(() => {
    const logText = logs.join("\n");
    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-logs-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logService.info("Logs descargados");
  }, [logs]);

  return {
    logs,
    addLog,
    clearLogs,
    downloadLogs
  };
};