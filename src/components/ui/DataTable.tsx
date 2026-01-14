import { ReactNode } from "react";
import { Card } from "./card";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  getRowKey: (item: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  emptyMessage = "No data available",
  getRowKey,
}: DataTableProps<T>) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={getRowKey(item)}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render
                        ? column.render(item)
                        : String((item as Record<string, unknown>)[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
