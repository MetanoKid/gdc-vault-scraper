"use strict";

// configuration
let configuration = {
	userDefined: {
		source: {
			//type: "url",
			//uri:  "http://www.gdcvault.com/browse/gdc-17"
			type: "file",
			uri:  "input/GDC Vault.html"
		},
		outputFile: "gdc_vault_links.txt"
	},
	internal: {
		baseURL: "http//www.gdcvault.com",
		outputFolder: "output/",
		membersOnlyRegexes: {
			vault:     /^loginPopup\(\'(.+)\'\); return false;$/,
			sponsored: /^sponsorRegPopup\(\'\d+\',\'(\d+)\',\'\d+\'\)$/
		}
	}
};

// external dependencies
let request = require("request");
let fs      = require("fs");
let mkdirp  = require("mkdirp");
let cheerio = require("cheerio");

// extracts a members-only link from an "onclick" attribute
let extractMembersOnlyLink = function(onclickCallback) {
	let matches = undefined;

	// Vault's members
	matches = onclickCallback.match(configuration.internal.membersOnlyRegexes.vault);

	if(matches !== null) {
		return matches[1];
	}

	// Sponsored's members
	matches = onclickCallback.match(configuration.internal.membersOnlyRegexes.sponsored);

	if(matches !== null) {
		return matches[1];
	}

	return undefined;
};

// process HTML data to obtain an object with all of the data we're interested in
let processHTML = function(html) {
	let $ = cheerio.load(html);
	let data = {};

	// special entry for links we can't complete
	data.unlinked = {};
	let addToUnlinked = function(mediaType, mediaTitle) {
		// ensure we've got the media type entry
		data.unlinked[mediaType] = (data.unlinked[mediaType] || Array());

		// add unlinked title
		data.unlinked[mediaType].push(mediaTitle);
	};

	// media entries in the DOM
	var mediaEntries = $("ul.media_items li a.session_item");

	// iterate over all entries
	mediaEntries.each(function(index, entry) {
		let $entry = $(entry);

		let mediaType = $entry.find(".media_type_image").attr("class").split(" ")[1];
		let mediaTitle = $entry.find(".conference_info > p > strong").text();

		// attempt to find the link
		let link = undefined;
		let membersOnly = false;

		if($entry.attr("onclick")) {
			let membersOnlyLink = extractMembersOnlyLink($entry.attr("onclick"));

			if(membersOnlyLink !== undefined) {
				link = membersOnlyLink;
				membersOnly = true;
			} else {
				addToUnlinked(mediaType, mediaTitle);

				// continue looping
				return;
			}
		} else {
			link = $entry.attr("href");
		}

		if(link === undefined) {
			addToUnlinked(mediaType, mediaTitle);

			// continue looping
			return;
		}

		// ensure we've got the media type entry
		data[mediaType] = (data[mediaType] || {});

		// add entry
		data[mediaType][mediaTitle] = {
			url: configuration.internal.baseURL + link,
			membersOnly: membersOnly
		}
	});

	return data;
};

// build a string to be written from the data we've processed
let convertProcessedDataToString = function(data) {
	return JSON.stringify(data, undefined, "\t");
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