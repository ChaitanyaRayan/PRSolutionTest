import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const ACCEPTED_MIME = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const ACCEPTED_EXT = ['.csv', '.xlsx', '.xls'];

/**
 * useFileUpload — handles file selection / drop, validation, and in-browser parsing.
 * Returns { file, headers, preview, parsedData, error, isDragging, onDrop, onFileSelect, reset }
 */
export function useFileUpload() {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [preview, setPreview] = useState([]);
  const [parsedData, setParsedData] = useState([]);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (f) => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    const mimeOk = ACCEPTED_MIME.includes(f.type) || f.type === '';
    const extOk = ACCEPTED_EXT.includes(ext);
    if (!mimeOk && !extOk) {
      return `"${f.name}" is not supported. Please upload a .csv or .xlsx file.`;
    }
    if (f.size > 50 * 1024 * 1024) {
      return `File exceeds 50 MB limit. Please upload a smaller file.`;
    }
    return null;
  };

  const parseCSV = (f) => {
    return new Promise((resolve, reject) => {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.errors.length && !result.data.length) {
            reject(new Error('Could not parse CSV: ' + result.errors[0].message));
          } else {
            resolve({ headers: result.meta.fields || [], data: result.data });
          }
        },
        error: (err) => reject(err),
      });
    });
  };

  const parseXLSX = (f) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          const hdrs = json.length ? Object.keys(json[0]) : [];
          resolve({ headers: hdrs, data: json });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(f);
    });
  };

  const processFile = useCallback(async (f) => {
    setError(null);
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      const result = ext === '.csv'
        ? await parseCSV(f)
        : await parseXLSX(f);

      setFile(f);
      setHeaders(result.headers);
      setPreview(result.data.slice(0, 10));
      setParsedData(result.data);
    } catch (err) {
      setError(`Failed to parse file: ${err.message}`);
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer?.files?.[0];
      if (dropped) processFile(dropped);
    },
    [processFile]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onFileSelect = useCallback(
    (e) => {
      const selected = e.target.files?.[0];
      if (selected) processFile(selected);
    },
    [processFile]
  );

  const reset = useCallback(() => {
    setFile(null);
    setHeaders([]);
    setPreview([]);
    setParsedData([]);
    setError(null);
  }, []);

  return {
    file,
    headers,
    preview,
    parsedData,
    error,
    isDragging,
    onDrop,
    onDragOver,
    onDragLeave,
    onFileSelect,
    reset,
  };
}
