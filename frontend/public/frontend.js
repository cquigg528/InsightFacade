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

function extractData(formData) {
	let datasetID;
	let searchKey;
	let searchComparator;
	let searchValue;
	let columns;
	let sortedBy;
	let useNot;
	switch (formData.get("kindOfDataset")) {
		case "courses":
			datasetID = formData.get("courses-datasetID");
			searchKey = formData.get("coursesSearchTerms");
			searchComparator = formData.get("coursesMcomparatorSelector").toUpperCase();
			if (searchComparator === "") {
				searchComparator = "IS";
				searchValue = formData.get("coursesSSearchTerm");
			} else {
				let NotComparators = ['LTEQ', 'GTEQ', 'NEQ'];
				NotComparators.includes(searchComparator) ? useNot = true : useNot = false;
				searchValue = parseFloat(formData.get("coursesMSearchTerm"));
			}
			columns = formData.getAll("courses-columns");
			sortedBy = formData.get("sortCourses");
			break;
		case "rooms":
			datasetID = formData.get("rooms-datasetID");
			searchKey = formData.get("roomsSearchTerms");
			searchComparator = formData.get("roomsMcomparatorSelector").toUpperCase();
			if (searchComparator === "") {
				searchComparator = "IS";
				searchValue = formData.get("roomsSSearchTerm");
			} else {
				searchValue = parseFloat(formData.get("roomsMSearchTerm"));
			}
			columns = formData.getAll("rooms-columns");
			sortedBy = formData.get("sortRooms");
			break;
	}
	return [datasetID, searchKey, searchComparator, searchValue, columns, sortedBy, useNot];
}

async function searchDatasets() {
	let formData = new FormData(document.querySelector('form[data-form="search-form"]'));
	let data = extractData(formData);
	let datasetID = data[0];
	let searchKey = data[1];
	let searchComparator = data[2];
	let searchValue = data[3];
	let columns = data[4];
	let sortedBy = data[5];
	let useNot = data[6];
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
		}
		searchObject[`${searchComparator}`] = compareObject;
		notObject["NOT"] = searchObject;
		queryObject["WHERE"] = notObject;
	} else {
		searchObject[`${searchComparator}`] = compareObject;
		queryObject["WHERE"] = searchObject;
	}
	columnsObject["COLUMNS"] = columns;
	orderObject["dir"] = "UP";
	orderObject["keys"] = `${datasetID}_${sortedBy}`
	columnsObject["ORDER"] = orderObject;
	queryObject["OPTIONS"] = columnsObject;
	const queryUrl = 'http://localhost:4321/query';
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
					alert(err.error)
				});
			}
		})
		.catch((e) => alert(e));
}

function displaySearchResults(jsonResult) {
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
					alert("Dataset was successfully deleted!");
				})} else {
				return response.json().then((err) => alert(err.error));
			}
		})
		.catch((err) => alert(err));
}
