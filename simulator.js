// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const numberPages = 4;
const numberProcesses = 3;
const runIntervalTime = 3000;

var processList = [];
for (var i = 0; i < numberProcesses; i++) {
	var pageList = [];
	// p: presence bit which indicates when a page is stored in the primary memory or not
	// frame: frame number of a page inside the primary memory (if p is true)
	for (var j = 0; j < numberPages; j++) {
		pageList.push({
			p: false,
			frame: 0
		});
	}
	processList.push(pageList);
}

// Page size in bytes
const pageSize = 4096;
// Memory size in pages
const primaryMemorySize = 4;
const virtualMemorySize = primaryMemorySize * 4;
const swapMemorySize = primaryMemorySize * 16;
const secondaryMemorySize = primaryMemorySize * 64;

var primaryMemoryList = [];
var virtualMemoryList = [];
var secondaryMemoryList = [];

var instructionLog = "";
var instructionInterval;

// Stats
var numberPageFaults = 0;

var instructionList = [];
// Random number of instructions between 20 and 5
var numberInstructions = Math.floor(Math.random() * (10 - 5)) + 5;
// Generating random instructions
for (var i = 0; i < numberInstructions; i++) {
	instructionList.push({
		processId: Math.floor(Math.random() * numberProcesses),
		pageId: Math.floor(Math.random() * numberPages)
	});
}

// Init + first iteration
initRender();
runInstruction();

// Functions:

// Runs next page request from a page. After finding it, updates all memory lists and renders data
function runInstruction(){
	if (instructionList.length > 0) {
		instructionLog = "Iniciando próxima requisição...";
		var pageLocation = checkMemory(0, instructionList[0]);
		// If the requested page isn't in primary memory, it's necessary to push it
		if (pageLocation.memoryType != 0){
			// If it's not in primary memory, it's a page fault.
			numberPageFaults++;
			// push() returns the new length of the array
			var frame = primaryMemoryList.push(instructionList[0]) - 1;
			// Updating process' page on its page table
			instructionLog += `\nAtualizando Tabela de Página do Processo ${instructionList[0].processId} com o frame atual da Página ${instructionList[0].pageId}.`;
			processList[instructionList[0].processId][instructionList[0].pageId].p = true;
			processList[instructionList[0].processId][instructionList[0].pageId].frame = frame;
			// Removing requested page from its previous location
			switch (pageLocation.memoryType){
				case 1: // Virtual
					virtualMemoryList.splice(pageLocation.index, 1);
					break;
			}
		}
		// If the requested page is in primary memory, everything's fine
		// Removing instruction from list and rendering updated data
		instructionList.splice(0, 1);
		renderData();
	}
}
// Searches for the requested page inside all memory tables
// Recursive function that uses a top-down search process, while considering page swaps
// Search Order: Primary Memory -> Virtual Memory -> Swap Memory -> Secondary Memory
function checkMemory(memoryType, page, pageToSave=null){
	var memoryList;
	var memorySize;
	var memoryName;
	// Getting data from the current memory type
	switch (memoryType){
		case 0: // Primary
		memoryList = primaryMemoryList;
		memorySize = primaryMemorySize;
		memoryName = "na Memória Primária";
		break;
		case 1: // Virtual
		memoryList = virtualMemoryList;
		memorySize = virtualMemorySize;
		memoryName = "na Memória Virtual";
		break;
		case 2: // Secondary
		// Stopping condition: Page is always stored inside the disk
		// No indexes are considered for it
		instructionLog += `\nProcurando por Página ${page.pageId} do Processo ${page.processId} no disco...`;
		instructionLog += "\nPágina Encontrada!";
		if (pageToSave != null)
		instructionLog += `\nSalvando Página ${pageToSave.pageId} do Processo ${pageToSave.processId} enviada da Memória Principal no disco.`;
		return {
			memoryType: 2,
			index: 0
		}
	}
	instructionLog += `\nProcurando por Página ${page.pageId} do Processo ${page.processId} ${memoryName}...`;
	// Search for the page inside the current memory list
	var index = memoryList.findIndex(function(element){
		return element.processId == page.processId && element.pageId == page.pageId;
	});
	// If it's found, return it, and save any page (sent from an upper memory that's full)
	// There's no need to verify if it has space to save since it can swap the requested page with the sent page (worst case)
	if (index != -1){
		instructionLog += "\nPágina Encontrada!";
		if (pageToSave != null){
			instructionLog += `\nSalvando Página ${pageToSave.pageId} do Processo ${pageToSave.processId} enviada da Memória Principal ${memoryName}.`;
			memoryList.push(pageToSave);
		}
		return {
			memoryType: memoryType,
			index: index
		}
	}
	// If it isn't found, send a request for the next memory
	else {
		// PAGE FAULT: page isn't located in any memory, so it will be requested from disk.
		if (memoryType == 0){
			instructionLog += "\nPage Fault! Página não se encontra na Memória Principal. Página será recuperada do disco.";
			// numberPageFaults++;
		}
		instructionLog += `\n Página não se encontra ${memoryName}.`;
		if (memoryList.length == memorySize){
			// PAGE SWAP: Send a page (chosen with a substitution algorithm) to the next memory so it can have space for the requested page
			if (memoryType == 0){
				// Current Substitution Algorithm: FIFO
				// Splice returns an array with the removed elements
				pageToSave = memoryList.splice(0, 1)[0];
				instructionLog += `\nMemória Primária cheia. Abrindo espaço removendo a Página ${pageToSave.pageId} do Processo ${pageToSave.processId}.`;
				// Change presence bit to false since it will be removed from primary memory
				processList[pageToSave.processId][pageToSave.pageId].p = false;
				return checkMemory(++memoryType, page, pageToSave);
			}
			else {
				// If the current memory received a page to save from a upper memory and it's full as well, send it to the next memory
				return checkMemory(++memoryType, page, pageToSave);
			}
		}
		else {
			// If the current memory received a page to save, save it
			if (pageToSave != null){
				instructionLog += `\nSalvando Página ${pageToSave.pageId} do Processo ${pageToSave.processId} enviada da Memória Principal ${memoryName}.`;
				memoryList.push(pageToSave);
			}
			// There's no need to send the saved page for the next memory since it wasn't full
			return checkMemory(++memoryType, page);
		}
	}
}

// Stop the process of running all instructions
function stopRunning(){
	clearInterval(instructionInterval);
}

// Runs all instructions at once using X ms intervals
function runAllInstructions(){
	// Sets a timer to run a instruction every 'runInterval' seconds;
	instructionInterval = setInterval(runInstruction, runIntervalTime);
	// Sets a timer to clear the interval after the last instruction is ran.
	setTimeout(()=>{clearInterval(instructionInterval)}, runIntervalTime*instructionList.length);
}

/*===== RENDER METHODS =====*/
// Initialising render event listeners and innerHTMLs that will not be modified anymore.
function initRender(){
	$("#numberProcesses").text(numberProcesses);
	document.getElementById("playButton").addEventListener("click", runInstruction);
	document.getElementById("playAllButton").addEventListener("click", runAllInstructions);
	document.getElementById("stopButton").addEventListener("click", stopRunning);
	$("#newRequestForm").submit((e)=>{
		e.preventDefault();
		let value = $("#newRequestField").val().split(';');
		instructionList.push({
			processId: value[0],
			pageId: value[1]
		});
		numberInstructions++;
		renderList();
	})
}

function renderMemorySizeStats(){
	document.getElementById("primaryMemorySize").innerHTML = primaryMemoryList.length * pageSize + "/" + primaryMemorySize * pageSize + " <small>Bytes alocados.</small>";
	document.getElementById("virtualMemorySize").innerHTML = virtualMemoryList.length * pageSize + "/" + virtualMemorySize * pageSize + " <small>Bytes alocados.</small>";
	document.getElementById("processesTableSize").innerHTML = numberProcesses+" <small>processos alocados.</small>";
}

function renderLog(){
	$("#logContainer").fadeOut(300, ()=>{
		$("#logText").html(instructionLog);
		$("#logContainer").fadeIn(300,null);
	})
}

function renderList(){
	$("#instruction").html(`Executando tempo <strong>${numberInstructions - instructionList.length} de ${numberInstructions}</strong>`);

	document.getElementById("instructionList").innerHTML = ""
	for (var i = 0; i < instructionList.length; i++) {
		document.getElementById("instructionList").innerHTML += `
			<tr>
				<td>${instructionList[i].processId}</td>
				<td>${instructionList[i].pageId}</td>
			</tr>
		`;
	}
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
}

// Render all simulation data that is modified between each iteration, such as allocated memory, page faults, etc.
function renderData(){
	$('#pageFaults').html(`${numberPageFaults} <small>Page Faults.</small>`);

	renderMemorySizeStats();

	if (primaryMemoryList.length > 0)
		document.getElementById("lastPageRequested").innerHTML = `Última Página Requisitada: <strong>Página ${primaryMemoryList[primaryMemoryList.length-1].pageId} do Processo ${primaryMemoryList[primaryMemoryList.length-1].processId}</strong>`;
	else
		document.getElementById("lastPageRequested").innerHTML = `Última Página Requisitada: <strong>--</strong>`;
	if (primaryMemoryList.length > 0)
		document.getElementById("lastPagePrimaryMemory").innerHTML = `Última Página Adicionada: <strong>Página ${primaryMemoryList[primaryMemoryList.length-1].pageId} do Processo ${primaryMemoryList[primaryMemoryList.length-1].processId}</strong>`;
	else
		document.getElementById("lastPagePrimaryMemory").innerHTML = `Última Página Adicionada: <strong>--</strong>`;
	if (virtualMemoryList.length > 0)
		document.getElementById("lastPageVirtualMemory").innerHTML = `Última Página Adicionada: <strong>Página ${virtualMemoryList[virtualMemoryList.length-1].pageId} do Processo ${virtualMemoryList[virtualMemoryList.length-1].processId}</strong>`;
	else
		document.getElementById("lastPageVirtualMemory").innerHTML = `Última Página Adicionada: <strong>--</strong>`;

	// Rendering instructions list and memory data;
	renderList();
	// Showing instruction logs
	renderLog();
}
