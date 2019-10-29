
const fs = require('fs');

const testFolderArr=[
    './chapter-01/',
    './chapter-02/',
    './chapter-03/',
    './chapter-04/',
    './chapter-05/',
    './chapter-06/',
    './chapter-07/',
    './chapter-08/',
    './chapter-09/',
    './chapter-10/',
    './chapter-11/',
    './chapter-12/',
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
var stream = fs.createWriteStream("my_file.html");
stream.once('open', function(fd) {
    fileArr.forEach(item=>{
        if (item.endsWith('.md'))return 
        stream.write(`<a href="${item}">${item}</a>
<br>\n`);
    })

  stream.end();
});