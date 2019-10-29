
const fs = require('fs');

const testFolderArr=[
    './ch02/',
    './ch03/',
    './ch04/',
    './ch05/',
    './ch07/',
    './ch08/',
    './ch09/',
    './ch10/',
]

// fs.readdir(testFolder, (err, files) => {
//   files.forEach(file => {
//     console.log(file);
//   });
// })
let fileArr=[]
testFolderArr.forEach(testFolder=>{
    let a = fs.readdirSync(testFolder)
   a=a.map(item=>{
       return testFolder+item
   })
   fileArr=fileArr.concat(a)
})
// console.log(fileArr);
// var stream = fs.createWriteStream("my_file.html");
// stream.once('open', function(fd) {
//   stream.write("My first row\n");
//   stream.write("My second row\n");
//   stream.end();
// });
var stream = fs.createWriteStream("index.html");
stream.once('open', function(fd) {
    stream.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>webgl</title>
    </head>
    <body>`);
    fileArr.forEach(item=>{
        if (item.endsWith('.md'))return 
        stream.write(`<a href="${item}">${item}</a>
<br>\n`);
    })
    stream.write(`
    </body>
    </html>`);
  stream.end();
});