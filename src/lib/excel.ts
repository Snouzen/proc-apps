export async function parseExcelFile(file: File, options?: any): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import("xlsx");
        const data = e.target?.result;
        const workbook = XLSX.read(data, {
          type: "array",
          cellDates: options?.cellDates ?? false,
        });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // If raw rows are requested
        if (options?.rawRows) {
          const allRows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            blankrows: true,
            defval: "",
          }) as any[][];
          resolve(allRows);
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          defval: options?.defval ?? "",
          raw: options?.raw ?? true,
        });
        resolve(jsonData as any[]);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
