function Table({ columns, rows, className = "" }) {
  const normalizedColumns = columns.map((column) =>
    typeof column === "string" ? { key: column, label: column } : column
  );

  return (
    <div className={`ui-table-wrap ${className}`.trim()}>
      <table className="ui-table">
        <thead>
          <tr>
            {normalizedColumns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id || rowIndex}>
              {normalizedColumns.map((column) => (
                <td key={`${column.key}-${row.id || rowIndex}`}>
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key] ?? row[column.label] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
