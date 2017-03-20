"use strict";

// configuration
let configuration = {
	"source": {
		"type": "url",
		"uri": "http://www.gdcvault.com/browse/gdc-17"
	},
	"outputFile": "gdc_vault_links.txt"
};

// external dependencies
let request = require("request");

// process HTML data to obtain an object with all of the data we're interested in
let processHTML = function(html) {
	// TODO
};

// write the contents of the processed data into the configured file
let writeProcessedData = function(processedData) {
	// TODO
};

// different ways to obtain the HTML data we will work with
let HTMLGetters = {
	"url": function(uri) {
		request(uri, function(error, request, html) {
			if(error) {
				return undefined;
			}

			return html;
		});
	}
};

// perform the full task
(function() {
	let htmlGetter = HTMLGetters[configuration.source.type];

	// ensure we've got a valid getter defined
	if(htmlGetter === undefined) {
		console.log("Invalid configuration source type. Valid ones are:");
		for(let type in HTMLGetters) {
			console.log("  " + type);
		}

		return;
	}

	// obtain the data
	htmlGetter(configuration.source.uri, function(html) {
		// ensure we've got some
		if(html === undefined) {
			console.log("Failed to obtain HTML data from the configured source.");
			return;
		}

		// extract links and build an object
		let processedData = processHTML(html);

		// write the data we've processed into the configured file
		writeProcessedData(processedData);
	});
})();