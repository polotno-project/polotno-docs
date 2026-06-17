import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from 'polotno/primitives';
import * as svg from 'polotno/utils/svg';
import React from 'react';
import { observer } from 'mobx-react-lite';

const SimpleTableEditor = ({ table, onChange }) => {
  const [data, setData] = React.useState(table);

  React.useEffect(() => {
    onChange(data);
    // eslint-disable-next-line
  }, [data]);

  const addRow = () => setData([...data, Array(data[0]?.length || 1).fill('')]);
  const addCol = () => setData(data.map((row) => [...row, '']));
  const removeRow = (i) => {
    if (i === 0) return; // Prevent removing header row
    setData(data.filter((_, idx) => idx !== i));
  };
  const removeCol = (j) => {
    if ((data[0]?.length || 0) <= 1) return; // Prevent removing last column
    setData(data.map((row) => row.filter((_, idx) => idx !== j)));
  };
  const setCell = (i, j, value) => {
    const newData = data.map((row) => [...row]);
    newData[i][j] = value;
    setData(newData);
  };

  return (
    <div>
      <table style={{ width: '100%', marginTop: 8 }}>
        <thead>
          <tr>
            {data[0]?.map((cell, j) => (
              <th key={j}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    value={cell}
                    onChange={(e) => setCell(0, j, e.target.value)}
                    style={{
                      width: '100%',
                      fontWeight: 'bold',
                      background: '#f5f8fa',
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    style={{ marginBottom: 0 }}
                    onClick={() => removeCol(j)}
                    title="Remove column"
                  >
                    ✕
                  </Button>
                </div>
              </th>
            ))}
            <th>
              <Button
                size="sm"
                onClick={addCol}
                style={{ marginLeft: 4 }}
                title="Add column"
              >
                ＋
              </Button>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.slice(1).map((row, i) => (
            <tr key={i + 1}>
              {row.map((cell, j) => (
                <td key={j}>
                  <input
                    value={cell}
                    onChange={(e) => setCell(i + 1, j, e.target.value)}
                    style={{ width: '100%' }}
                  />
                </td>
              ))}
              <td>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRow(i + 1)}
                  title="Remove row"
                >
                  ✕
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8 }}>
        <Button size="sm" onClick={addRow} title="Add row">
          Add Row
        </Button>
      </div>
    </div>
  );
};

// Helper to convert table data to SVG string and return both SVG string and height
export function tableToSvg(table) {
  if (!table || !table.length) return { svg: '', height: 40 };
  const header = table[0];
  const rows = table.slice(1);
  const rowHeight = 40;
  const svgHeight = Math.max(40, table.length * rowHeight);
  const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 ${svgHeight}" height="${svgHeight}">
  <foreignObject width="600" height="${svgHeight}">
    <body xmlns="http://www.w3.org/1999/xhtml">
    <style>
table {
  font-family: arial, sans-serif;
  border-collapse: collapse;
  width: 100%;
}
td, th {
  border: 1px solid #dddddd;
  text-align: left;
  padding: 8px;
  height: ${rowHeight - 2}px;
}
tr:nth-child(even) {
  background-color: #dddddd;
}
</style>
    <table>
      <tr>
        ${header.map((cell) => `<th>${cell}</th>`).join('')}
      </tr>
      ${rows
        .map(
          (row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`
        )
        .join('')}
    </table>
    </body>
  </foreignObject>
</svg>
`;
  console.log(svgHeight, 600 / svgHeight);
  return {
    src: svg.svgToURL(svgString),
    height: svgHeight,
    ratio: svgHeight / 600,
  };
}

export const SvgEditTableButton = observer(({ store, element }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  if (!element?.custom?.table) return null;
  const table = element.custom.table;
  return (
    <>
      <Button variant="ghost" onClick={() => setIsOpen(true)}>
        Edit Table
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent style={{ width: 800, maxWidth: '90vw' }}>
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
          </DialogHeader>
          <div
            style={{ width: '100%', height: '60vh', minHeight: 300, padding: 24 }}
          >
          <SimpleTableEditor
            table={table}
            onChange={(newTable) => {
              const { src, height, ratio } = tableToSvg(newTable);
              element.set({
                custom: {
                  ...element.custom,
                  table: newTable,
                },
                src,
                height: element.width / ratio,
              });
            }}
          />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});
