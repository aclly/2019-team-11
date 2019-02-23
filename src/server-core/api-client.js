import convert from "xml-js";
import axios from "axios";
import {
    FIBI_URL,
    FIBI_BY_SITE_URL,
    EPA_URL,
    WATERSHED_DATA_URL,
    SAMPLE_RESULTS_URL,
    ERROR_SHE_GET_WET
} from "./constants/urls";
// axios.defaults.timeout = 1000000000;

class point {
    constructor(){
	this.locId = "";
	this.name = "";
	this.lat = 0.0;
	this.long = 0.0;
	this.datas = [];
    }
}

class Data {
    constructor(){
	this.name = "";
	this.unit = "";
	this.value = 0.0;
	this.date = "";
	this.locId = "";
    }
}


async function getEcoliData(huc) {
    let charName = "Escherichia%20coli";
    let result = await getSampleResults(huc, charName);
    // let locations = await getEpaStations(huc, charName);

    let parsedResult = new DOMParser().parseFromString(result.data, "text/xml");
    let activities = parsedResult.getElementsByTagName("Activity");

    let samples = new Map();
    for (let activity of activities) {
        let sample = {};
        const getTagValue = qualifiedName => {
            let tag = activity.getElementsByTagName(qualifiedName)[0];
            return tag === undefined ? null : tag.childNodes[0].nodeValue;
        };

        sample.name = getTagValue("MonitoringLocationIdentifier");
        sample.date = getTagValue("ActivityStartDate");
        sample.value = getTagValue("ResultMeasureValue");

        let existing = samples[sample.name];
        if (
            existing == null ||
            Date.parse(sample.date) > Date.parse(existing.date)
        ) {
            samples.set(sample.name, sample);
        }
    }

    return samples;
}

async function getNitrateData(huc) {
    return await getSampleResults(huc, "Nitrate");
}

function getValueDataFromXml(xml) {
    let parsedResult = new DOMParser().parseFromString(xml, "text/xml");
    let activities = parsedResult.getElementsByTagName("Activity");
    let samples = new Map();
    for (let activity of activities) {
	let sample = new Data();
	
        const getTagValue = (qualifiedName) => {
            let tag = activity.getElementsByTagName(qualifiedName)[0];
            return (tag === undefined) ? null :tag.childNodes[0].nodeValue;
        };

        sample.name = getTagValue("CharacteristicName");
	sample.locId = getTagValue("MonitoringLocationIdentifier");
        sample.date = getTagValue("ActivityStartDate");
        sample.value = getTagValue("ResultMeasureValue");
	sample.unit = getTagValue("MeasureUnitCode");

        let existing = samples[sample.locId];
        if (existing == null || (Date.parse(sample.date) > Date.parse(existing.date))) {
            samples.set(sample.locId, sample);
        }
    }

    return samples;
}

async function getFibiData(huc) {
    var isHuc12 = huc.length === 12;
    var huc8 = huc.substring(0, 8);
    var url = FIBI_URL;

    return axios
        .get(url + huc8)
        .then(response => {
            return response.data;
        })
        .then(sites => {
            if (isHuc12) {
                var filteredSites = sites.filter(site => site.huc12 === huc);
                return Promise.resolve(filteredSites);
            }
            return Promise.resolve(sites);
        })
        .then(sites => {
            return sites.map(site => site.id);
        })
        .then(siteIds => {
            return Promise.all(siteIds.map(fetchFibiDataBySiteId));
        })
        .then(results => {
            return [].concat.apply([], results);
        })
        .then(results => {
            // sort
            return results.sort((a, b) => {
                return new Date(b.sampleDate) - new Date(a.sampleDate);
            });
        })
        .then(results => {
            // most recent
            return results[0];
        })
        .then(result => {
            return {
                name: result.site.name,
                lat: result.site.LatDD,
                long: result.site.LongDD,
                data: [
                    {
                        name: "FIBI",
                        unit: "rating",
                        value: result.FIBI,
                        type: result.FIBIType,
                        class: result.FIBIClass,
                        date: result.sampleDate
                    }
                ]
            };
        })
        .catch(function(error) {
            // handle error
            console.log(error);
            return ERROR_SHE_GET_WET;
        });
}

async function fetchFibiDataBySiteId(siteId) {
    var url = FIBI_BY_SITE_URL;
    return axios.get(url + siteId).then(response => {
        return response.data;
    });
}

async function getEpaStations(huc, characteristicName) {
    var url = EPA_URL;
    // TODO: externalize startDateLo from query
    var query = `startDateLo=01-01-2017&huc=${huc}&mimeType=xml&characteristicName=Nitrate${characteristicName}`;
    axios
        .get(url + query)
        .then(function(response) {
            // handle success
            console.log(response);
            return convert.xml2json(response, { compact: true, spaces: 4 });
        })
        .catch(function(error) {
            // handle error
            console.log(error);
            return ERROR_SHE_GET_WET;
        });
}

async function getSampleResults(huc, characteristicName) {
    var url = SAMPLE_RESULTS_URL;
    // TODO: externalize startDateLo from query -> subtract 2 months from today
    var query = `
        "startDateLo=01-01-2017&huc=${huc}&mimeType=xml&characteristicName=${characteristicName}`;
    return axios.get(url + query);
}

async function getHuc(lat, long) {}

export default {
    getEcoliData,
    getFibiData,
    getEpaStations,
    getSampleResults,
    getHuc
};
