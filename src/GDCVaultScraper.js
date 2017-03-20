"use strict";

// configuration
let configuration = {
	"userDefined": {
		"source": {
			//"type": "url",
			//"uri": "http://www.gdcvault.com/browse/gdc-17"
			"type": "file",
			"uri": "input/GDC Vault.html"
		},
		"outputFile": "gdc_vault_links.txt"
	},
	"internal": {
		"baseURL": "http//www.gdcvault.com",
		"outputFolder": "output/"
	}
};

// external dependencies
let request = require("request");
let fs      = require("fs");
let mkdirp  = require("mkdirp");
let cheerio = require("cheerio");

// process HTML data to obtain an object with all of the data we're interested in
let processHTML = function(html) {
	let $ = cheerio(html);
	let data = {};

	return data;
};

// build a string to be written from the data we've processed
let convertProcessedDataToString = function(data) {
	return JSON.stringify(data);
};

// write the contents of the processed data into the configured file
let writeProcessedData = function(dataAsString) {
	let outputFilePath = configuration.internal.outputFolder + configuration.userDefined.outputFile;
	
	// ensure the folder structure exists
	mkdirp(configuration.internal.outputFolder, function(error) {
		if(error) {
			console.log("There was an error when creating directory '" + configuration.internal.outputFolder + "'");
			return;
		}

		// write contents to the file
		fs.writeFileSync(outputFilePath, dataAsString);
	});
};

// different ways to obtain the HTML data we will work with
let HTMLGetters = {
	"url": function(uri, onResponse) {
		request(uri, function(error, request, html) {
			if(error) {
				onResponse(undefined);
			}

			onResponse(html);
		});
	},
	"file": function(uri, onResponse) {
		fs.readFile(uri, "UTF-8", function(error, data) {
			if(error) {
				onResponse(undefined);
			}

			onResponse(data);
		});
	}
};

// perform the full task
(function() {
	let htmlGetter = HTMLGetters[configuration.userDefined.source.type];

	// ensure we've got a valid getter defined
	if(htmlGetter === undefined) {
		console.log("Invalid configuration source type. Valid ones are:");
		for(let type in HTMLGetters) {
			console.log("  " + type);
		}

		return;
	}

	// obtain the data
	htmlGetter(configuration.userDefined.source.uri, function(html) {
		// ensure we've got some
		if(html === undefined) {
			console.log("Failed to obtain HTML data from the configured source.");
			return;
		}

		// extract links and build an object
		let data = processHTML(html);

		// convert processed data to a writable string
		let dataAsString = convertProcessedDataToString(data);

		// write the data we've processed into the configured file
		writeProcessedData(dataAsString);
	});
})();