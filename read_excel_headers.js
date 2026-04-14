const xlsx = require('xlsx');
const workbook = xlsx.readFile('ejemplo_descargar_base.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
console.log(JSON.stringify(jsonData[0]));
