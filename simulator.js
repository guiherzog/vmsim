// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
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
// Generating random instructions
for (var i = 0; i < numberInstructions; i++) {
	instructionList.push({
		processId: Math.floor(Math.random() * numberProcesses),
		pageId: Math.floor(Math.random() * numberPages)
	});
}

initRender();
runInstruction();

function runInstruction(){
	if (instructionList.length > 0) {
		console.log("Running an instruction...");
		var pageLocation = checkMemory(0, instructionList[0]);
		if (pageLocation.memoryType != 0){
			// push() returns the new length of the array
			var frame = primaryMemoryList.push(instructionList[0]) - 1;
			processList[instructionList[0].processId][instructionList[0].pageId].p = true;
			processList[instructionList[0].processId][instructionList[0].pageId].frame = frame;
			switch (pageLocation.memoryType){
				case 1: // Virtual
					virtualMemoryList.splice(pageLocation.index, 1);
					break;
				case 2: // Swap
					swapMemoryList.splice(pageLocation.index, 1);
					break;
			}
		}
		instructionList.splice(0, 1);
		renderData();
	}
}

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

function initRender(){
	document.getElementById("numberProcesses").innerHTML = numberProcesses;
	document.getElementById("playButton").addEventListener("click", function(){
		runInstruction();
	});
}

function renderData(){
	document.getElementById("instruction").innerHTML = `Executando tempo <strong>${numberInstructions - instructionList.length} de ${numberInstructions}</strong>`;

	document.getElementById("primaryMemorySize").innerHTML = primaryMemoryList.length * pageSize + "/" + primaryMemorySize * pageSize + " <small>Bytes alocados.</small>";
	document.getElementById("virtualMemorySize").innerHTML = virtualMemoryList.length * pageSize + "/" + virtualMemorySize * pageSize + " <small>Bytes alocados.</small>";
	document.getElementById("swapMemorySize").innerHTML = swapMemoryList.length * pageSize + "/" + swapMemorySize * pageSize + " <small>Bytes alocados.</small>";

	if (primaryMemoryList.length > 0)
		document.getElementById("lastPagePrimaryMemory").innerHTML = `Última Página Adicionada: <strong>Página ${primaryMemoryList[primaryMemoryList.length-1].pageId} do Processo ${primaryMemoryList[primaryMemoryList.length-1].processId}</strong>`;
	else
		document.getElementById("lastPagePrimaryMemory").innerHTML = `Última Página Adicionada: <strong>--</strong>`;
	if (virtualMemoryList.length > 0)
		document.getElementById("lastPageVirtualMemory").innerHTML = `Última Página Adicionada: <strong>Página ${virtualMemoryList[virtualMemoryList.length-1].pageId} do Processo ${virtualMemoryList[virtualMemoryList.length-1].processId}</strong>`;
	else
		document.getElementById("lastPageVirtualMemory").innerHTML = `Última Página Adicionada: <strong>--</strong>`;
	if (swapMemoryList.length > 0)
		document.getElementById("lastPageSwapMemory").innerHTML = `Última Página Adicionada: <strong>Página ${swapMemoryList[swapMemoryList.length-1].pageId} do Processo ${swapMemoryList[swapMemoryList.length-1].processId}</strong>`;
	else
		document.getElementById("lastPageSwapMemory").innerHTML = `Última Página Adicionada: <strong>--</strong>`;

	document.getElementById("primaryMemoryList").innerHTML = "";
	for (var i = 0; i < primaryMemoryList.length; i++) {
		document.getElementById("primaryMemoryList").innerHTML += `
			<tr>
				<td>${i}</td>
				<td>${primaryMemoryList[i].pageId}</td>
				<td>${primaryMemoryList[i].processId}</td>
			</tr>
		`;
	}
	document.getElementById("virtualMemoryList").innerHTML = "";
	for (var i = 0; i < virtualMemoryList.length; i++) {
		document.getElementById("virtualMemoryList").innerHTML += `
			<tr>
				<td>${i}</td>
				<td>${virtualMemoryList[i].pageId}</td>
				<td>${virtualMemoryList[i].processId}</td>
			</tr>
		`;
	}
	document.getElementById("swapMemoryList").innerHTML = "";
	for (var i = 0; i < swapMemoryList.length; i++) {
		document.getElementById("swapMemoryList").innerHTML += `
			<tr>
				<td>${i}</td>
				<td>${swapMemoryList[i].pageId}</td>
				<td>${swapMemoryList[i].processId}</td>
			</tr>
		`;
	}
}