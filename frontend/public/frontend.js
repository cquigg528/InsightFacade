async function generateHeaderMessage() {
	let headerContainer = document.getElementById("campus-explorer-container");
	while (headerContainer.firstChild) {
		headerContainer.removeChild(headerContainer.firstChild);
	}
	let header = document.createElement("div");
	header.className = "header";
	header.innerText = "UBC Campus Explorer";
	header.id = "campus-explorer-header";
	headerContainer.append(header);
	let subheader = document.createElement("campus-explorer-subheader");
	subheader.className = "subheader";
	subheader.id = "campus-explorer-subheader";
	let response = await fetch('http://localhost:4321/datasets');
	let results = await response.json();
	let jsonDatasets = results.result;
	if (jsonDatasets.length === 0) {
		subheader.innerText = "Find your favourite courses and rooms at the University of British Columbia!\nSimply add a dataset to start searching!";
	} else {
		subheader.innerText = "Find your favourite courses and rooms at the University of British Columbia!";
	}
	headerContainer.append(subheader);
}

function toggleAddForm() {
	let ele = document.getElementById("add-dataset-form");
	ele.style.display === 'block' ? ele.style.display = 'none' : ele.style.display = 'block';
}

function toggleSearchForm() {
	let ele = document.getElementById("search-datasets-form");
	ele.style.display === 'block' ? ele.style.display = 'none' : ele.style.display = 'block';
}

function showCoursesSelections() {
	document.getElementById("courses-selections").style.display = 'block';
	document.getElementById("rooms-selections").style.display = 'none';
}

function showRoomsSelections() {
	document.getElementById("rooms-selections").style.display = 'block';
	document.getElementById("courses-selections").style.display = 'none';
}

function toggleCoursesAverage() {
	let label = document.getElementById("sort-courses-avg-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleCoursesID() {
	let label = document.getElementById("sort-courses-id-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleCoursesDept() {
	let label = document.getElementById("sort-courses-dept-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleCoursesInstructor() {
	let label = document.getElementById("sort-courses-instructor-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleCoursesTitle() {
	let label = document.getElementById("sort-courses-title-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleCoursesPass() {
	let label = document.getElementById("sort-courses-pass-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleCoursesFail() {
	let label = document.getElementById("sort-courses-fail-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleCoursesAudit() {
	let label = document.getElementById("sort-courses-audit-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleCoursesYear() {
	let label = document.getElementById("sort-courses-year-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleCoursesUUID() {
	let label = document.getElementById("sort-courses-uuid-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleRoomsSeats() {
	let label = document.getElementById("sort-rooms-seats-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleRoomsLat() {
	let label = document.getElementById("sort-rooms-lat-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleRoomsLon() {
	let label = document.getElementById("sort-rooms-lon-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleRoomsNumber() {
	let label = document.getElementById("sort-rooms-number-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleRoomsFullname() {
	let label = document.getElementById("sort-rooms-fullname-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleRoomsShortname() {
	let label = document.getElementById("sort-rooms-shortname-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleRoomsName() {
	let label = document.getElementById("sort-rooms-name-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleRoomsAddress() {
	let label = document.getElementById("sort-rooms-address-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleRoomsType() {
	let label = document.getElementById("sort-rooms-type-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function toggleRoomsFurniture() {
	let label = document.getElementById("sort-rooms-furniture-container");
	label.style.display === 'block' ? label.style.display = 'none' : label.style.display = 'block';
}

function checkCoursesSelectedSearchTerm()
{
	let searchSelect = document.getElementById("courses-search-terms");
	let selectedValue = searchSelect.options[searchSelect.selectedIndex].value;
	if (selectedValue === "Select here") {
		return;
	}
	let mkeysArray = ["avg", "pass", "fail", "year", "audit"];
	if (mkeysArray.includes(selectedValue))
	{
		document.getElementById("courses-mcomparator-search-container").style.display = 'block';
		document.getElementById("courses-scomparator-search-container").style.display = 'none';
	} else {
		document.getElementById("courses-mcomparator-search-container").style.display = 'none';
		document.getElementById("courses-scomparator-search-container").style.display = 'block';
	}
}

function checkRoomsSelectedSearchTerm()
{
	let searchSelect = document.getElementById("rooms-search-terms");
	let selectedValue = searchSelect.options[searchSelect.selectedIndex].value;
	if (selectedValue === "Select here") {
		return;
	}
	let mkeysArray = ["lat", "lon", "seats"];
	if (mkeysArray.includes(selectedValue))
	{
		document.getElementById("rooms-mcomparator-search-container").style.display = 'block';
		document.getElementById("rooms-scomparator-search-container").style.display = 'none';
	} else {
		document.getElementById("rooms-mcomparator-search-container").style.display = 'none';
		document.getElementById("rooms-scomparator-search-container").style.display = 'block';
	}
}

function cloneCourseSearchTerms() {
	let list = document.getElementById("courses-search-list");
	let elemToClone = document.getElementById("courses-search");
	let clonedElem = elemToClone.cloneNode(true);
	console.log(clonedElem.childNodes);
	list.append(clonedElem);
	console.log(list);
}

function extractData(formData) {
	let datasetID;
	let searchKey;
	let searchComparator;
	let searchValue;
	let columns;
	let sortedString;
	let dir;
	let sortedBy;
	let useNot = false;
	let mkeysArray;
	switch (formData.get("kindOfDataset")) {
		case "courses":
			datasetID = formData.get("courses-datasetID");
			searchKey = formData.get("coursesSearchTerms");
			searchComparator = formData.get("coursesComparator");
			mkeysArray = ["avg", "pass", "fail", "year", "audit"];
			if (mkeysArray.includes(searchKey)) {
				searchComparator = searchComparator.toUpperCase();
				let NotComparators = ['LTEQ', 'GTEQ', 'NEQ'];
				useNot = NotComparators.includes(searchComparator);
				searchValue = parseFloat(formData.get("coursesMSearchTerm"));
			} else {
				searchComparator = "IS";
				useNot = formData.get("coursesNot") === "not";
				searchValue = formData.get("coursesSSearchTerm");
			}
			console.log(searchComparator);
			columns = formData.getAll("courses-columns");
			sortedString = formData.get("sortCourses");
			if (sortedString) {
				sortedBy = sortedString.split("_")[0];
				dir = sortedString.split("_")[1];
			}
			break;
		case "rooms":
			datasetID = formData.get("rooms-datasetID");
			searchKey = formData.get("roomsSearchTerms");
			searchComparator = formData.get("roomsComparator");
			mkeysArray = ["lat", "lon", "seats"];
			if (mkeysArray.includes(searchKey)) {
				searchComparator = searchComparator.toUpperCase();
				let NotComparators = ['LTEQ', 'GTEQ', 'NEQ'];
				useNot = NotComparators.includes(searchComparator);
				searchValue = parseFloat(formData.get("roomsMSearchTerm"));
			} else {
				searchComparator = "IS";
				useNot = formData.get("roomsNot") === "not";
				searchValue = formData.get("roomsSSearchTerm");
			}
			columns = formData.getAll("rooms-columns");
			sortedString = formData.get("sortRooms");
			if (sortedString) {
				sortedBy = sortedString.split("_")[0];
				dir = sortedString.split("_")[1];
			}
			break;
	}
	return [datasetID, searchKey, searchComparator, searchValue, columns, sortedBy, useNot, dir];
}

async function searchDatasets() {
	let formData = new FormData(document.querySelector('form[data-form="search-form"]'));
	console.log(...formData);
	let data = extractData(formData);
	let datasetID = data[0];
	let searchKey = data[1];
	let searchComparator = data[2];
	let searchValue = data[3];
	let columns = data[4];
	let sortedBy = data[5];
	let useNot = data[6];
	let dir = data[7];
	let i = 0;
	for (let column in columns) {
		column = `${datasetID}_${columns[i]}`;
		columns[i] = column;
		i++;
	}
	let queryObject = {};
	let searchObject = {};
	let compareObject = {};
	let columnsObject = {};
	let orderObject = {};
	let notObject = {};
	compareObject[`${datasetID}_${searchKey}`] = searchValue;
	if (useNot) {
		switch (searchComparator) {
			case "LTEQ":
				searchComparator = "GT";
				break;
			case "GTEQ":
				searchComparator = "LT";
				break;
			case "NEQ":
				searchComparator = "EQ";
				break;
			default:
				break;
		}
		searchObject[`${searchComparator}`] = compareObject;
		notObject["NOT"] = searchObject;
		queryObject["WHERE"] = notObject;
	} else {
		searchObject[`${searchComparator}`] = compareObject;
		queryObject["WHERE"] = searchObject;
	}
	columnsObject["COLUMNS"] = columns;
	if (dir && sortedBy) {
		orderObject["dir"] = dir.toUpperCase();
		orderObject["keys"] = `${datasetID}_${sortedBy}`
		columnsObject["ORDER"] = orderObject;
	}
	queryObject["OPTIONS"] = columnsObject;
	const queryUrl = 'http://localhost:4321/query';
	console.log(queryObject);
	return fetch(queryUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(queryObject)
	})
		.then((response) => {
			if (response.ok) {
				response.json().then((result) => {
					displaySearchResults(result);
				});
			} else {
				return response.json().then((err) => {
					alert(`Your search in invalid because of the following error: ${err.error}\nPlease modify your search and try again!`)
				});
			}
		})
		.catch((e) => alert(e));
}

function displaySearchResults(jsonResult) {
	console.log(jsonResult);
	document.getElementById("search-results-container").style.display = 'block';
	let resultsList = document.getElementById("search-results-list");
	resultsList.innerHTML = '';
	for (let i = 0; i < jsonResult.result.length; i++) {
		const datasetElement = document.createElement('li');
		Object.keys(jsonResult.result[i]).forEach((key) => {
			const keyElement = document.createElement('div');
			keyElement.innerText = `${key}: ${jsonResult.result[i][key]}`
			datasetElement.append(keyElement);
		})
		resultsList.append(datasetElement);
	}
}

async function uploadFile() {
	let formData = new FormData(document.querySelector('form[data-form="add-form"]'));
	const datasetID = formData.get("datasetID");
	const kind = formData.get("kind");
	const putUrl = `http://localhost:4321/dataset/${datasetID}/${kind}`;
	const file = formData.get("fileupload");
	return fetch(putUrl, {
		method: 'PUT',
		body: file
	})
		.then((response) => {
			if (response.ok) {
				return response.json().then((result) => {
					let subheader = document.getElementById("campus-explorer-subheader");
					subheader.innerText = "Find your favourite courses and rooms at the University of British Columbia!";
					alert("File was successfully uploaded!");
				})} else {
					return response.json().then((err) => alert(err.error));
				}
			})
		.catch((e) => alert(e));
}

async function showDatasets() {
	let datasetsList = document.getElementById('view-datasets-list');
	if (datasetsList.style.display === 'block') {
		datasetsList.style.display = 'none';
		return;
	} else {
		datasetsList.style.display = 'block';
	}
	let response = await fetch('http://localhost:4321/datasets');
	let results = await response.json();
	let jsonDatasets = results.result;
	if (jsonDatasets.length === 0) {
		alert("No datasets currently added - please add one by clicking by clicking the 'Add Dataset' button!");
		return;
	}
	datasetsList.innerHTML = '';
	for (let i = 0; i < jsonDatasets.length; i++) {
		const datasetElement = document.createElement('li');
		datasetElement.id = `dataset-element-${jsonDatasets[i].id}`;
		datasetElement.innerText = `Dataset name: ${jsonDatasets[i].id}\n Dataset type: ${jsonDatasets[i].kind}\n Number of rows: ${jsonDatasets[i].numRows}\n`;
		const deleteLink = document.createElement('button');
		deleteLink.innerHTML = `<button id="delete-dataset" class="deleteDatasetButton" onclick="deleteDataset('${jsonDatasets[i].id}')"> Delete Dataset </button>`;
		datasetElement.append(deleteLink);
		datasetsList.append(datasetElement);
	}
}

async function deleteDataset(datasetID) {
	const deleteUrl = `http://localhost:4321/dataset/${datasetID}`;
	return fetch(deleteUrl, {
		method: 'DELETE'
	})
		.then((response) => {
			if (response.ok) {
				return response.json().then((result) => {
					document.getElementById(`dataset-element-${result.result}`).remove();
					alert("Dataset was successfully deleted!");
				})} else {
				return response.json().then((err) => alert(err.error));
			}
		})
		.catch((err) => alert(err));
}
