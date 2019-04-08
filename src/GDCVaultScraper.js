"use strict";

// configuration
let configuration = {
	baseURL: "https://www.gdcvault.com",
	outputFolder: "output/",
	membersOnlyRegexes: {
		vault:     /^loginPopup\(\'(.+)\'\); return false;$/,
		sponsored: /^sponsorRegPopup\(\'\d+\',\'(\d+)\',\'\d+\'\)$/
	},
	csvSeparator: ";"
};

// external dependencies
let userDefinedConfiguration = require("./configuration.js");
let request                  = require("request");
let fs                       = require("fs");
let mkdirp                   = require("mkdirp");
let cheerio                  = require("cheerio");

// different ways to obtain the HTML data we will work with
let HTMLGetters = {
	"url": function(uri, onResponse) {
		console.log("Querying '" + uri + "'...");

		request(uri, function(error, request, html) {
			if(error) {
				onResponse(undefined);
			}

			onResponse(html);
		});
	},
	"file": function(uri, onResponse) {
		console.log("Reading file '" + uri + "'...");

		fs.readFile(uri, "UTF-8", function(error, data) {
			if(error) {
				onResponse(undefined);
			}

			onResponse(data);
		});
	}
};

// different ways to represent processed data as string
let ToStringProcessors = {
	// JSON output
	json: function(data) {
		return JSON.stringify(data, undefined, "\t");
	},
	// plain text output
	plain: function(data) {
		let output = "";

		// per conference
		for(let conference in data) {
			output += "### Conference: " + conference + "\n";

			// per media type
			for(let mediaType in data[conference]) {
				output += "\n## Media type: " + mediaType + "\n";

				// per category
				for(let category in data[conference][mediaType]) {
					output += "\n# Category: " + category + "\n\n";

					// each resource
					for(let title in data[conference][mediaType][category]) {
						let entry = data[conference][mediaType][category][title];

						output += entry.url + " " + title + "\n";
					}
				}
			}
		}

		return output;
	},
	// CSV output
	csv: function(data) {
		let separator = configuration.csvSeparator;
		let output = "";

		// headers
		output += "Conference";
		output += separator + "Media type";
		output += separator + "Category";
		output += separator + "Title";
		output += separator + "Speaker";
		output += separator + "Company";
		output += separator + "Link";
		output += separator + "Free content";
		output += "\n";

		// dump data
		for(let conference in data) {
			for(let mediaType in data[conference]) {
				for(let category in data[conference][mediaType]) {
					for(let title in data[conference][mediaType][category]) {
						let entry = data[conference][mediaType][category][title];

						output += conference;
						output += separator + mediaType;
						output += separator + category;
						output += separator + title;
						output += separator + entry.speaker.name;
						output += separator + entry.speaker.company;
						output += separator + entry.url;
						output += separator + (entry.membersOnly ? "No" : "Yes");
						output += "\n";
					}
				}
			}
		}

		return output;
	}
};

// build a string to be written from the data we've processed
let convertProcessedDataToString = function(data) {
	let toString = ToStringProcessors[userDefinedConfiguration.output.type];

	if(toString === undefined) {
		console.log("Can't find output toString processor '" +
			userDefinedConfiguration.output.type + "'. Defaulting to JSON");

		return ToStringProcessors.json(data);
	}

	return toString(data)
};

// write the contents of the processed data into the configured file
let writeProcessedData = function(dataAsString) {
	let outputFilePath = configuration.outputFolder + userDefinedConfiguration.output.file;
	
	// ensure the folder structure exists
	mkdirp(configuration.outputFolder, function(error) {
		if(error) {
			console.log("There was an error when creating directory '" + configuration.outputFolder + "'");
			return;
		}

		// write contents to the file
		fs.writeFileSync(outputFilePath, dataAsString);
		console.log("Written contents in '" + outputFilePath + "'");
	});
};

// extracts a members-only link from an "onclick" attribute
let extractMembersOnlyLink = function(onclickCallback) {
	let matches = undefined;

	// Vault's members
	matches = onclickCallback.match(configuration.membersOnlyRegexes.vault);

	if(matches !== null) {
		return {
			link: configuration.baseURL + matches[1]
		};
	}

	// Sponsored's members
	matches = onclickCallback.match(configuration.membersOnlyRegexes.sponsored);

	if(matches !== null) {
		return {
			link: configuration.baseURL + "/play/" + matches[1] + "/",
			sponsored: true
		};
	}

	return undefined;
};

// process HTML data to obtain an object with all of the data we're interested in
let processHTML = function(html) {
	let $ = cheerio.load(html);
	let data = {};

	// special entry for links we can't complete
	let addToUnlinked = function(conferenceName, category, mediaType, mediaTitle) {
		// ensure we've got the path we need
		data[conferenceName] = (data[conferenceName] || {});
		data[conferenceName].unlinked = {};
		data[conferenceName].unlinked[mediaType] = (data[conferenceName].unlinked[mediaType] || {});
		data[conferenceName].unlinked[mediaType][category] = (data[conferenceName].unlinked[mediaType][category] || []);

		// add unlinked title
		data[conferenceName].unlinked[mediaType][category].push(mediaTitle);
	};

	// media entries in the DOM
	var mediaEntries = $("ul.media_items li a.session_item");

	// iterate over all entries
	mediaEntries.each(function(index, entry) {
		let $entry = $(entry);
		let $info = $($entry.find(".conference_info > p"));

		let mediaType = $entry.find(".media_type_image").attr("class").split(" ")[1];
		let mediaTitle = $info.find("> strong").text().trim();
		let conferenceName = $info.find(".conference_name").text().trim();
		let category = $info.find(".track_name").text().trim();
		let $speakerInfo = $($info.find("> span:not(.conference_name,.track_name)"));
		let speaker = $speakerInfo.clone().children().remove().end().text().trim();
		let extraSpeakerInfo = $speakerInfo.find("> strong").text().trim().match(/^\((.+)\)$/);
		let company = extraSpeakerInfo !== null && extraSpeakerInfo[1];

		// clean up some of the fields
		mediaTitle = mediaTitle.replace(/['"]/g, "");

		// attempt to find the link
		let link = undefined;
		let membersOnly = false;

		if($entry.attr("onclick")) {
			let membersOnlyData = extractMembersOnlyLink($entry.attr("onclick"));

			if(membersOnlyData !== undefined) {
				link = membersOnlyData.link;
				membersOnly = true;
			} else {
				addToUnlinked(conferenceName, category, mediaType, mediaTitle);

				// continue looping
				return;
			}
		} else {
			link = $entry.attr("href");
		}

		if(link === undefined) {
			addToUnlinked(conferenceName, category, mediaType, mediaTitle);

			// continue looping
			return;
		}

		// ensure we've got the conference
		data[conferenceName] = (data[conferenceName] || {});

		// ensure we've got the media type entry
		data[conferenceName][mediaType] = (data[conferenceName][mediaType] || {});

		// ensure we've got the category
		data[conferenceName][mediaType][category] = (data[conferenceName][mediaType][category] || {});

		// add entry
		data[conferenceName][mediaType][category][mediaTitle] = {
			url: link,
			membersOnly: membersOnly,
			speaker: {
				name: speaker,
				company: company
			}
		}
	});

	return data;
};

// perform the full task
(function() {
	let htmlGetter = HTMLGetters[userDefinedConfiguration.input.type];

	// ensure we've got a valid getter defined
	if(htmlGetter === undefined) {
		console.log("Invalid configuration source type. Valid ones are:");
		for(let type in HTMLGetters) {
			console.log("  " + type);
		}

		return;
	}

	// obtain the data
	htmlGetter(userDefinedConfiguration.input.uri, function(html) {
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