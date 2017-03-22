# GDC Vault Scraper

So that time in the year comes again when the GDC Vault gets updated with the last conference's resources... And you think: _Woah, it would be awesome to have all of the links to these resources in one file..._

Introducing **GDC Vault Scraper**.

## Executing

  * Be sure to have Node.js installed.
  * Clone or download this repository.
  * Open a command line prompt in the folder.
  * Run `npm install` to have all of the dependencies for the project.
  * Update `src/configuration.js` to match the conference you want to extract links from.
  * Execute `gdc-vault-scraper.bat` if you're on Windows, `node src/GDCVaultScraper.js` otherwise.

## Configuring

Open `src/configuration.js` to see the configuration options:

  * `input`: whether to get data from an URL or a local file (HTML, pre-downloaded from the URL).
  * `output`: output file and format to use when writing all of the links.

## Disclaimer

Do what you please with the list of links you get. The author of this project isn't responsible of the usage of the links you obtain.    
Although this project only performs one request if you use the URL method, the local file option is given to avoid performing too many requests to GDC Vault.
