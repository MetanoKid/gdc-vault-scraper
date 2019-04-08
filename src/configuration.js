module.exports = {
	input: {
		type: "url",
		uri:  "https://www.gdcvault.com/browse/gdc-19"
		/*type: "file",
		uri:  "input/GDC Vault.html"*/
	},
	output: {
		/*type: "json",
		file: "gdc_vault_links.json"*/
		/*type: "plain",
		file: "gdc_vault_links.txt"*/
		type: "csv",
		file: "gdc_vault_links.csv"
	}
};
