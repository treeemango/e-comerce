/**
 * Utility for parsing CSV and TSV data with support for quoted values and multiple delimiters.
 */

export interface ParsedRow {
    [key: string]: string;
}

export interface ParseResult {
    data: ParsedRow[];
    headers: string[];
    errors: string[];
}

export class CSVParser {
    /**
     * Parse a CSV/TSV string into an array of objects
     */
    static parse(content: string, delimiter: string = ','): ParseResult {
        const lines = content.split(/\r?\n/);
        const data: ParsedRow[] = [];
        const errors: string[] = [];

        if (lines.length < 2) {
            return { data, headers: [], errors: ['File is empty or missing headers'] };
        }

        // Parse headers
        const headers = this.parseLine(lines[0], delimiter);

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = this.parseLine(line, delimiter);
            const row: ParsedRow = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            data.push(row);
        }

        return { data, headers, errors };
    }

    /**
     * Parse a single line of CSV/TSV data, handling quoted strings and escaped characters
     */
    private static parseLine(line: string, delimiter: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    /**
     * Detect delimiter automatically (CSV, TSV, or Semicolon)
     */
    static detectDelimiter(content: string): string {
        const firstLine = content.split('\n')[0];
        const counts = {
            ',': (firstLine.match(/,/g) || []).length,
            '\t': (firstLine.match(/\t/g) || []).length,
            ';': (firstLine.match(/;/g) || []).length
        };

        if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t';
        if (counts[';'] > counts[',']) return ';';
        return ',';
    }
}
