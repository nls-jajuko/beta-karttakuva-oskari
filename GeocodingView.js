import GeocodingService from './GeocodingService';

const SearchDefaultView = Oskari.clazz.get('Oskari.mapframework.bundle.search.DefaultView');

export class GeocodingView extends SearchDefaultView {
    constructor(instance) {
        super(instance);
        let epsg = this.sandbox.findRegisteredModuleInstance('MainMapModule').getProjection(),
            epsgCode = epsg.split(':')[1],
            lang = Oskari.getLang(),
            urls = {
                search: 'https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v1/pelias/search?',
                similar: 'https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v1/searchterm/similar?'
            };
        this.service = new GeocodingService(urls, epsgCode, lang);
    }

    __doSearch() {
        let self = this,
            field = this.getField(),
            searchContainer = this.getContainer(),
            searchString = field.getValue(this.instance.safeChars),
            resultsEl = searchContainer[0].querySelectorAll('div.resultList'),
            infoEl = searchContainer[0].querySelectorAll('div.info');

        while (resultsEl.firstChild)
            resultsEl.removeChild(resultsEl.firstChild);
        while (infoEl.firstChild)
            infoEl.removeChild(infoEl.firstChild);

        if (!searchString || searchString.length == 0) {
            return;
        }

        this.service.search(searchString).then(r => r.json()).then(json => {
            let res = {
                locations: json.features.map(f => {
                    return {
                        "zoomScale": 5000,
                        "name": f.properties.label,
                        "rank": f.properties.rank,
                        "lon": f.geometry.coordinates[0],
                        "id": f.properties.placeId,
                        "type": f.properties['label:placeType'],
                        "region": f.properties['label:municipality'],
                        "village": f.properties['label'],
                        "lat": f.geometry.coordinates[1],
                        "channelId": "GEOCODING"
                    }
                })
            };
            res.totalCount = res.locations.length;
            self.handleSearchResult(true, res, searchString);

        }).catch(function (err) { /* we fail often due to autocomplete*/ });
    }

    __doAutocompleteSearch() {
        let lang = Oskari.getLang(),
            field = this.getField(),
            searchString = field.getValue(this.instance.safeChars);

        if (!searchString || searchString.length == 0) {
            return;
        }

        this.__doSearch();

        this.service.similar(searchString).then(r => r.json()).then(json => {
            if (!json.terms || !json.terms.length) {
                return;
            }

            let autocompleteValues = json.terms.map(f => {
                return {
                    value: f.text.indexOf(' ') != -1 ? '"' + f.text + '"' : f.text, data: f.text
                };
            });

            if (autocompleteValues.length) {
                field.autocomplete(autocompleteValues);
            }
        }).catch(function (err) { /* we fail often due to autocomplete*/ });
    }

    _validateSearchKey(key) {
        return true;
    }
}