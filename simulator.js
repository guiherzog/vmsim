// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const numberPages = 4;
const numberProcesses = 3;
const runIntervalTime = 1000;

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
const primaryMemorySize = 8;
const virtualMemorySize = primaryMemorySize * 4;
const secondaryMemorySize = primaryMemorySize * 64;

var primaryMemoryList = [];
var virtualMemoryList = [];

var instructionLog = [];
var instructionInterval;

// Stats
var numberPageFaults = 0;
var pageFaultRatePerTime = [numberInstructions];
var clockIndex = 0;
var instructionIndex = 0;

var instructionList = [];
// Random number of instructions between 20 and 5
const maxInstructions = 100;
const minInstructions = 20
var numberInstructions = Math.floor(Math.random() * (maxInstructions - minInstructions)) + minInstructions;
var currentStep = 0;
// Generating random instructions
for (var i = 0; i < numberInstructions; i++) {
	instructionList.push({
		processId: Math.floor(Math.random() * numberProcesses),
		pageId: Math.floor(Math.random() * numberPages),
		referenced: false,
	});
}

// Init + first iteration
initRender();
runInstruction();

// Functions:

// Runs next page request from a page. After finding it, updates all memory lists and renders data
function runInstruction(){
	currentStep++;
	if (instructionList.length > 0) {
		instructionLog.push(["Iniciando próxima requisição..."]);
		var pageLocation = checkMemory(0, instructionList[0]);
		// If the requested page isn't in primary memory, it's necessary to push it
		if (pageLocation.memoryType != 0){
			// If it's not in primary memory, it's a page fault.
			numberPageFaults++;
			// push() returns the new length of the array
			clockIndex - 1 === -1 ? pushIndex = primaryMemoryList.length-1 : pushIndex = clockIndex-1;
			if (primaryMemoryList.length == primaryMemorySize){
				primaryMemoryList[pushIndex] = instructionList[0];
				var frame = pushIndex;
			}
			else
				var frame = primaryMemoryList.push(instructionList[0]) - 1;
			// Updating process' page on its page table
			instructionLog[instructionIndex].push(`Atualizando Tabela de Página do Processo ${instructionList[0].processId} com o frame atual da Página ${instructionList[0].pageId}.`);
			processList[instructionList[0].processId][instructionList[0].pageId].p = true;
			processList[instructionList[0].processId][instructionList[0].pageId].frame = frame;
			// Removing requested page from its previous location
			switch (pageLocation.memoryType){
				case 1: // Virtual
					virtualMemoryList.splice(pageLocation.index, 1);
					break;
			}
		}

		// Update rate of page faults.
		pageFaultRatePerTime[currentStep-1] = numberPageFaults/currentStep;
		// If the requested page is in primary memory, everything's fine
		// Removing instruction from list and rendering updated data
		instructionList.splice(0, 1);
		renderData();
		// for (var i = 0; i < instructionLog[instructionIndex].length; i++) {
		// 	console.log(instructionLog[instructionIndex][i]);
		// }
		instructionIndex++;
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
		case 1: // Swap
		memoryList = virtualMemoryList;
		memorySize = virtualMemorySize;
		memoryName = "no Espaço de Swap";
		break;
		case 2: // Secondary
		// Stopping condition: Page is always stored inside the disk
		// No indexes are considered for it
		instructionLog[instructionIndex].push(`Procurando por Página ${page.pageId} do Processo ${page.processId} no Disco...`);
		instructionLog[instructionIndex].push("Página Encontrada!");
		if (pageToSave != null)
		instructionLog[instructionIndex].push(`Salvando Página ${pageToSave.pageId} do Processo ${pageToSave.processId} enviada da Memória Principal no Disco.`);
		return {
			memoryType: 2,
			index: 0
		}
	}
	instructionLog[instructionIndex].push(`Procurando por Página ${page.pageId} do Processo ${page.processId} ${memoryName}...`);
	// Search for the page inside the current memory list
	var index = memoryList.findIndex(function(element){
		return element.processId == page.processId && element.pageId == page.pageId;
	});
	// If it's found, return it, and save any page (sent from an upper memory that's full)
	// There's no need to verify if it has space to save since it can swap the requested page with the sent page (worst case)
	if (index != -1){
		instructionLog[instructionIndex].push("Página Encontrada!");
		if (memoryType === 0){
			memoryList[index].referenced = true;
		}
		if (pageToSave != null){
			instructionLog[instructionIndex].push(`Salvando Página ${pageToSave.pageId} do Processo ${pageToSave.processId} enviada da Memória Principal ${memoryName}.`);
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
			instructionLog[instructionIndex].push("Page Fault! Página não se encontra na Memória Primária.");
			// numberPageFaults++;
		}
		else
			instructionLog[instructionIndex].push(`Página não se encontra ${memoryName}.`);
		if (memoryList.length == memorySize){
			// PAGE SWAP: Send a page (chosen with a substitution algorithm) to the next memory so it can have space for the requested page
			if (memoryType == 0){
				// Current Substitution Algorithm: CLOCK
				pageToSave = clockSubstitution(memoryList);
				instructionLog[instructionIndex].push(`Memória Primária cheia. Abrindo espaço removendo a Página ${pageToSave.pageId} do Processo ${pageToSave.processId}.`);
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
				instructionLog[instructionIndex].push(`Salvando Página ${pageToSave.pageId} do Processo ${pageToSave.processId} enviada da Memória Principal ${memoryName}.`);
				memoryList.push(pageToSave);
			}
			// There's no need to send the saved page for the next memory since it wasn't full
			return checkMemory(++memoryType, page);
		}
	}
}

function clockSubstitution(memoryList){
	while (true){
		if (memoryList[clockIndex].referenced)
		{
			memoryList[clockIndex].referenced = false;
			clockIndex++;
		} else {
			// Update the reference bit.
			let res = memoryList[clockIndex];
			clockIndex = ++clockIndex % primaryMemoryList.length;
			return res;
		}
		// If it's finished looking on the memory, start again.
		if (clockIndex >= memoryList.length)
			clockIndex = 0;
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
			pageId: value[1],
			referenced: false,
		});
		numberInstructions++;
		renderList();
	})
	$("#newRequestField").focus(()=>{
		renderNotification('top','center');
	})
}

function renderMemorySizeStats(){
	document.getElementById("primaryMemorySize").innerHTML = primaryMemoryList.length * pageSize + "/" + primaryMemorySize * pageSize + " <small>Bytes alocados.</small>";
	document.getElementById("virtualMemorySize").innerHTML = virtualMemoryList.length * pageSize + "/" + virtualMemorySize * pageSize + " <small>Bytes alocados.</small>";
	document.getElementById("processesTableSize").innerHTML = numberProcesses+" <small>processos alocados.</small>";
}

function renderLog(){
	var innerHTML = "";
	for (var i = 0; i < instructionLog[instructionIndex].length; i++) {
		innerHTML += `
			<li>
				<a href="#">${instructionLog[instructionIndex][i]}</a>
			</li>
		`;
	}
	$("#numberLogs").html(instructionLog[instructionIndex].length);
	$("#instructionLog").html(innerHTML);
	// $("#logContainer").fadeOut(300, ()=>{
	// 	$("#logText").html(instructionLog);
	// 	$("#logContainer").fadeIn(300,null);
	// });
}

function renderPages(p){
	var tRows = ``;
	for (var i = 0; i < numberPages; i++) {
		tRows +=`
			<tr ${processList[p][i].p ? 'class="success"':null}>
				<td>${i}</td>
				<td>${processList[p][i].p ? 'Sim':'Não'} </td>
				<td>${processList[p][i].frame}</td>
			</tr>
		`;
	}
	return tRows;
}

function renderProcessesList(){
	document.getElementById("processesPageTable").innerHTML = "";
	for (var i = 0; i < numberProcesses; i++) {
		document.getElementById("processesPageTable").innerHTML += `
		<h4>Processo ${i}</h4>
		<table class="table table-hover">
			<thead class="text-danger">
				<th>ID da Página</th>
				<th>Mapeada?</th>
				<th>ID do Frame</th>
			</thead>
			<tbody>
				${renderPages(i)}
			</tbody>
		</table>`;
	}
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
	for (var i = 0; i < primaryMemorySize; i++) {
		document.getElementById("primaryMemoryList").innerHTML += `
			<tr ${i === clockIndex ? 'class="info"':null}>
				<td>${i}</td>
				<td>${primaryMemoryList.length > i ? primaryMemoryList[i].processId : '--'}</td>
				<td>${primaryMemoryList.length > i ? primaryMemoryList[i].pageId : '--'}</td>
				<td>${primaryMemoryList.length > i ? primaryMemoryList[i].referenced ? 'Sim': 'Não' : '--'}</td>
			</tr>
		`;
	}
	document.getElementById("virtualMemoryList").innerHTML = "";
	for (var i = 0; i < virtualMemorySize; i++) {
		document.getElementById("virtualMemoryList").innerHTML += `
			<tr>
				<td>${i}</td>
				<td>${virtualMemoryList.length > i ? virtualMemoryList[i].processId : '--'}</td>
				<td>${virtualMemoryList.length > i ? virtualMemoryList[i].pageId : '--'}</td>
			</tr>
		`;
	}
	renderProcessesList();
}

function renderPageFaultChart(){
	var labelArray = [numberInstructions];
	for (var i = 1; i <= numberInstructions; i++) {
		labelArray[i-1] = i;
	};

	dataPageFaultChart = {
			labels: labelArray,
			series: [pageFaultRatePerTime]
	};

	optionsPageFaultChart = {
			lineSmooth: Chartist.Interpolation.cardinal({
					tension: 0
			}),
			scaleMinSpace: 1,
			low: 0,
			high: 1.05,
			chartPadding: { top: 0, right: 5, bottom: 0, left: 0},
	}

	var pageFaultRateChart = new Chartist.Line('#pageFaultRateChart', dataPageFaultChart, optionsPageFaultChart);

}

function renderNotification(from, align){
		$.notify({
				icon: "note_add",
				message: "Digite o processo, ponto e vírgula e a página. Ex: 0;1 para Página 1 do Processo 0"

			},{
					type: 'info',
					timer: 4000,
					placement: {
							from: from,
							align: align
					}
			});
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

	// Render charts;
	renderPageFaultChart();

	// Showing instruction logs
	renderLog();
}
