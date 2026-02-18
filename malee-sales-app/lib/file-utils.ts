import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedData {
    headers: string[];
    rows: any[];
    summary: {
        rowCount: number;
        colCount: number;
        emptyCells: number;
    };
}

export const parseFile = async (file: File): Promise<ParsedData> => {
    return new Promise((resolve, reject) => {
        const fileExt = file.name.split('.').pop()?.toLowerCase();

        if (fileExt === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results: any) => {
                    const headers = results.meta.fields || [];
                    const rows = results.data;

                    let emptyCells = 0;
                    rows.forEach((row: any) => {
                        Object.values(row).forEach(val => {
                            if (val === null || val === undefined || val === '') emptyCells++;
                        });
                    });

                    resolve({
                        headers,
                        rows,
                        summary: {
                            rowCount: rows.length,
                            colCount: headers.length,
                            emptyCells
                        }
                    });
                },
                error: (error: Error) => reject(error)
            });
        } else if (fileExt === 'xlsx' || fileExt === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    if (rows.length === 0) {
                        resolve({ headers: [], rows: [], summary: { rowCount: 0, colCount: 0, emptyCells: 0 } });
                        return;
                    }

                    const headers = rows[0] as string[];
                    const dataRows = rows.slice(1).map(row => {
                        const obj: any = {};
                        headers.forEach((header, index) => {
                            obj[header] = (row as any[])[index];
                        });
                        return obj;
                    });

                    let emptyCells = 0;
                    dataRows.forEach(row => {
                        Object.values(row).forEach(val => {
                            if (val === null || val === undefined || val === '') emptyCells++;
                        });
                    });

                    resolve({
                        headers,
                        rows: dataRows,
                        summary: {
                            rowCount: dataRows.length,
                            colCount: headers.length,
                            emptyCells
                        }
                    });
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsBinaryString(file);
        } else {
            reject(new Error('Unsupported file type'));
        }
    });
};
