// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var virtualmemory = require('./simulator/virtualmemory');

// console.log(virtualmemory);

// document.getElementById("navbar-brand").innerHTML = virtualmemory;

const numberPages = 8;
const numberProcesses = 16;

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
const primaryMemorySize = 4;
const virtualMemorySize = primaryMemorySize * 1;
const swapMemorySize = primaryMemorySize * 16;
const secondaryMemorySize = primaryMemorySize * 64;

var primaryMemoryList = [];
var virtualMemoryList = [];
var swapMemoryList = [];
var secondaryMemoryList = [];

var instructionList = [];
// Random number of instructions between 20 and 5
const numberInstructions = Math.floor(Math.random() * (21 - 5)) + 5;
console.log(numberInstructions + " Instructions");
// Generating random instructions
for (var i = 0; i < numberInstructions; i++) {
	instructionList.push({
		processId: Math.floor(Math.random() * numberProcesses),
		pageId: Math.floor(Math.random() * numberPages)
	});
}

// Time to run some instructions
for (var i = 0; i < instructionList.length; i++) {
	var pageLocation = checkMemory(0, instructionList[i]);
	if (pageLocation.memoryType != 0){
		// push() returns the new length of the array
		var frame = primaryMemoryList.push(instructionList[i]) - 1;
		processList[instructionList[i].processId][instructionList[i].pageId].p = true;
		processList[instructionList[i].processId][instructionList[i].pageId].frame = frame;
		switch (pageLocation.memoryType){
			case 1: // Virtual
				virtualMemoryList.slice(pageLocation.index, 1);
				break;
			case 2: // Swap
				swapMemoryList.slice(pageLocation.index, 1);
				break;
		}
	}
}

console.log("Primary Memory:");
console.dir(primaryMemoryList);
console.log("Virtual Memory:");
console.dir(virtualMemoryList);
console.log("Swap Memory:");
console.dir(swapMemoryList);

function checkMemory(memoryType, page, pageToSave=null){
	var memoryList;
	var memorySize;
	switch (memoryType){
		case 0: // Primary
			memoryList = primaryMemoryList;
			memorySize = primaryMemorySize;
			break;
		case 1: // Virtual
			memoryList = virtualMemoryList;
			memorySize = virtualMemorySize;
			break;
		case 2: // Swap
			memoryList = swapMemoryList;
			memorySize = swapMemorySize;
			break;
		case 3: // Secondary
			return {
				memoryType: 3,
				index: 0
			}
	}
	var index = memoryList.findIndex(function(element){
		return element == page;
	});
	if (index != -1){
		if (pageToSave != null){
			memoryList.push(pageToSave);
		}
		return {
			memoryType: memoryType,
			index: index
		}
	}
	else {
		if (memoryList.length == memorySize){
			if (memoryType == 0){
				// FIFO
				// Splice returns an array with the removed elements
				pageToSave = memoryList.splice(0, 1)[0];
				processList[pageToSave.processId][pageToSave.pageId].p = false;
				return checkMemory(++memoryType, page, pageToSave);
			}
			else {
				if (pageToSave != null){
					return checkMemory(++memoryType, page, pageToSave);
				}
			}
		}
		else{
			if (pageToSave != null){
				memoryList.push(pageToSave);
			}
			return checkMemory(++memoryType, page);
		}
	}
}