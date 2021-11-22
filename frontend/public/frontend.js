const putUrl = "http://localhost:4321/dataset/:id/:kind"
const datasetInput = document.getElementById('datasetInput');
datasetInput.addEventListener("change", handleFiles, false);

async function handleFiles(){
	let formData = new FormData();
	formData.append("fileToUpload", datasetInput.files[0]);

	const xhr = new XMLHttpRequest();
	await xhr.open('PUT', putUrl, true);
	xhr.onload = () => {
		console.log("dataset updated");
	};
	xhr.send(formData);

}
