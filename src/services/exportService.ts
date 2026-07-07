import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { Parser } from 'json2csv';

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'parquet' | 'tsv';

export interface ExportOptions {
  filename: string;
  format: ExportFormat;
  data: any[];
  columns?: string[];
}

export class ExportService {
  async export(options: ExportOptions): Promise<string> {
    const { filename, format, data, columns } = options;

    if (data.length === 0) {
      throw new Error('Cannot export empty dataset');
    }

    switch (format) {
      case 'csv':
        return this.exportToCSV(filename, data, columns);
      case 'xlsx':
        return this.exportToXLSX(filename, data, columns);
      case 'json':
        return this.exportToJSON(filename, data);
      case 'tsv':
        return this.exportToTSV(filename, data, columns);
      case 'parquet':
        return this.exportToParquet(filename, data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async exportToCSV(filename: string, data: any[], columns?: string[]): Promise<string> {
    try {
      const json2csvParser = new Parser({
        fields: columns || Object.keys(data[0])
      });
      const csv = json2csvParser.parse(data);

      const filepath = path.join(filename);
      await fs.promises.writeFile(filepath, csv, 'utf8');
      return filepath;
    } catch (error) {
      throw new Error(`CSV export failed: ${error}`);
    }
  }

  private async exportToXLSX(filename: string, data: any[], columns?: string[]): Promise<string> {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Auto-fit column widths
      if (columns) {
        const colWidths = columns.map(col => ({ wch: Math.max(col.length, 15) }));
        ws['!cols'] = colWidths;
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Results');

      const filepath = path.join(filename);
      XLSX.writeFile(wb, filepath);
      return filepath;
    } catch (error) {
      throw new Error(`XLSX export failed: ${error}`);
    }
  }

  private async exportToJSON(filename: string, data: any[]): Promise<string> {
    try {
      const filepath = path.join(filename);
      const jsonData = JSON.stringify(data, null, 2);
      await fs.promises.writeFile(filepath, jsonData, 'utf8');
      return filepath;
    } catch (error) {
      throw new Error(`JSON export failed: ${error}`);
    }
  }

  private async exportToTSV(filename: string, data: any[], columns?: string[]): Promise<string> {
    try {
      const json2csvParser = new Parser({
        fields: columns || Object.keys(data[0]),
        delimiter: '\t'
      });
      const tsv = json2csvParser.parse(data);

      const filepath = path.join(filename);
      await fs.promises.writeFile(filepath, tsv, 'utf8');
      return filepath;
    } catch (error) {
      throw new Error(`TSV export failed: ${error}`);
    }
  }

  private async exportToParquet(filename: string, data: any[]): Promise<string> {
    // Parquet export would require additional dependencies
    // For now, we'll export as JSON
    throw new Error('Parquet export coming soon! Export as JSON or CSV for now.');
  }

  getExtension(format: ExportFormat): string {
    const extensions: Record<ExportFormat, string> = {
      csv: '.csv',
      xlsx: '.xlsx',
      json: '.json',
      tsv: '.tsv',
      parquet: '.parquet'
    };
    return extensions[format];
  }

  getDefaultFilename(format: ExportFormat, connectionName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `${connectionName}_${timestamp}${this.getExtension(format)}`;
    return filename;
  }
}