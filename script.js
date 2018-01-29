'use strict';

// Tasks:
// - parse csv-formatted data;
// - represent all lines as objects with fields named after csv coloumns;
// - sort the array by the faculty field;
// - prompt user to enter some names of faculties;
// - find those faculties in the array of objects;
// - for each faculty get the length of the data retrieved from its url.

const fs = require('fs');
const http = require('http');
const readline = require('readline');

// returns array of arrays with parsed csv data
const parse = (csv, delim = ',') => (
  csv.split('\n').filter(el => !!el).map(line => line.split(delim))
);

// returns array of parsed objects with fields named after csv coloumns
const objectify = data => {
  const header = data.shift();
  return data.map(line => line.reduce((acc, el, index) => {
    acc[header[index]] = el;
    return acc;
  }, {}));
};

// returns array of needles replaced with found objects
// or undefined instead of some needle if it can't be found,
// case insensitive.
const find = (data, needles) => needles.map(needle => (
  data.find(el => el.faculty.toLowerCase() === needle.toLowerCase())
));

// url: string
// cb(err, data): function
//   err: Error instance or null
//   data: string, defined if err is null
const getUrlContent = (url, cb) => {
  http.get(url, res => {
    if (res.statusCode !== 200) {
      cb(new Error(`${res.statusCode} ${res.statusMessage}`));
      res.resume();
      return;
    }

    const data = [];

    res.on('data', chunk => data.push(chunk));
    res.on('end', () => cb(null, Buffer.concat(data).toString()));
  }).on('error', err => cb(err));
};

// Usage

const csv = fs.readFileSync('data.csv').toString();
const parsed = parse(csv);
const data = objectify(parsed).sort((a, b) => {
  if (a.faculty > b.faculty) return 1;
  else if (a.faculty < b.faculty) return -1;
  return 0;
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Enter names of faculties: ');
rl.prompt();

rl.on('line', ans => {
  const needles = ans.split(' ').filter(el => !!el); // delete empty values
  const found = find(data, needles).filter(el => !!el);
  if (!needles.length || !found.length) {
    console.log('Invalid input or nothing was found, try again: ');
    rl.prompt();
  } else {
    found.forEach(el => getUrlContent(el.url, (err, data) => {
      if (err) {
        const msg = `\x1b[1;33m${err.message}\x1b[0m`;
        console.error(`${el.faculty} (${el.url}) - error:\t`, msg);
      } else
        console.log(`${el.faculty} (${el.url}) data length:\t`, data.length);
    }));
    rl.close();
  }
});
