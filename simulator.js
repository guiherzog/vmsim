// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var virtualmemory = require('./simulator/virtualmemory');

// console.log(virtualmemory);


const numberPages = 8;
const numberProcesses = 16;
document.getElementById("numberProcesses").innerHTML = numberProcesses;

var processList = [];
for (var i = 0; i < numberProcesses; i++) {
	var pageList = [];
	// p: presence bit which indicates when a page is stored in the primary memory or not
	// frame: frame number of a page (if p is true)
	for (var j = 0; j < numberPages; j++) {
		pageList.push({
			p: false,
			frame: 0
		});
	}
	processList.push(pageList);
}

// Page size in bytes
const pageSize = 1024;
// Memory size in pages
const primaryMemorySize = 32;
const virtualMemorySize = primaryMemorySize * 1;
const secondaryMemorySize = primaryMemorySize * 64;
const swapMemorySize = primaryMemorySize * 16;

var primaryMemoryList = [];
var virtualMemoryList = [];
var secondaryMemoryList = [];
var swapMemoryList = [];

var instructionList = [];
// Random number of instructions between 20 and 5
const numberInstructions = Math.floor(Math.random() * (21 - 5)) + 5;
// Generating random instructions
for (var i = 0; i < numberInstructions; i++) {
	instructionList.push({
		processId: Math.floor(Math.random() * numberProcesses),
		pageId: Math.floor(Math.random() * numberPages)
	});
}
